import SQLite from 'tauri-plugin-sqlite-api';
import { appLocalDataDir } from '@tauri-apps/api/path';
import { createDir } from '@tauri-apps/api/fs';
import { readKudosDb } from '$lib/kudos/db';
import { shortId } from '$lib/utils/short-id';

const cache = {};

export const dbPathForDistId = async (distListId) => {
  if (!distListId) {
    throw new Error('distListId required');
  }
  const baseDir = await appLocalDataDir();
  await createDir(`${baseDir}dist-lists`, {
    recursive: true,
  });
  const dbFullPath = `${baseDir}dist-lists/${distListId}.db`;
  //console.log('dbFullPath', dbFullPath);
  // "/Users/mattmankins/Library/Application Support/com.tauri.dev/dist-lists/abcdefg.db

  return dbFullPath;
};

export const initDb = async ({ distList }) => {
  const distListId = distList.id;
  const dbFullPath = await dbPathForDistId(distListId);

  const db = await SQLite.open(dbFullPath);

  // only init create table once per session (or time period?)
  // @ts-ignore
  if (false && cache[`distlist-${distListId}`]) {
    return db;
  }
  cache[`distlist-${distListId}`] = Date.now();

  // get the current file's schema version
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY UNIQUE,
      value TEXT NOT NULL
    );  
    INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1');
    `);

  // allow for future schema changes
  // const schemaVersion = await db.select(
  //   `SELECT value FROM settings WHERE key = 'schema_version'`
  // );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS kudos (
        id TEXT PRIMARY KEY UNIQUE,
        user SMALLINT NOT NULL DEFAULT 0,
        cohort TEXT NOT NULL DEFAULT '',
        identifier VARCHAR(255) NOT NULL,
        weight FLOAT NOT NULL DEFAULT 1,
        createTime DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME'))),
        description TEXT NOT NULL DEFAULT '',
        traceId TEXT,
        context TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_user ON kudos ('user');
    CREATE INDEX IF NOT EXISTS idx_identifier ON kudos ('identifier');
    CREATE INDEX IF NOT EXISTS idx_createTime ON kudos ('createTime');
    CREATE INDEX IF NOT EXISTS idx_traceId ON kudos ('traceId');
    
    CREATE TABLE IF NOT EXISTS dist_list_log (
        id TEXT PRIMARY KEY UNIQUE,
        distListId TEXT NOT NULL,
        traceId TEXT NOT NULL,
        ts DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME'))),
        action TEXT NOT NULL DEFAULT 'add',
        description TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_distListId ON dist_list_log ('distListId');
    CREATE INDEX IF NOT EXISTS idx_traceId ON dist_list_log ('traceId');
    CREATE INDEX IF NOT EXISTS idx_ts ON dist_list_log ('ts');    
    `);

  return db;
};

export const addFileToDistList = async ({ filePath, distList }) => {
  if (!filePath) {
    throw new Error('source file missing');
  }
  if (!distList || !distList.id) {
    throw new Error('dist list missing');
  }

  // TODO: slurps all into memory.
  const kudos = await readKudosDb({ dbFile: filePath });
  if (!kudos) {
    throw new Error('Unable to read Kudos File [a]');
  }

  // console.log({ kudos }, 'now');

  const db = await initDb({ distList });
  if (!db) {
    throw new Error('Unable to init db');
  }

  // foreach kudos, insert into dist list if they don't already have that id
  let inserted = 0;
  const traceId = shortId();
  for (const kudo of kudos) {
    const result = await db.select(`SELECT id FROM kudos WHERE id = ?`, [
      kudo.id,
    ]);
    if (!result || result.length === 0) {
      const res = await db.execute(
        `INSERT OR IGNORE INTO kudos (id, user, cohort, identifier, weight, createTime, description, traceId, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kudo.id,
          kudo.user || 0,
          kudo.cohort,
          kudo.identifier,
          kudo.weight,
          kudo.createTime,
          kudo.description,
          kudo.traceId || traceId,
          kudo.context,
        ]
      );
      //       console.log({res, kudo});
      //       console.log(        `INSERT OR IGNORE INTO kudos (id, user, cohort, identifier, weight, createTime, description, traceId, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      //       [
      //         kudo.id,
      //         kudo.user,
      //         kudo.cohort,
      //         kudo.identifier,
      //         kudo.weight,
      //         kudo.createTime,
      //         kudo.description,
      //         kudo.traceId,
      //         kudo.context,
      //       ]
      // )
      inserted++;
    }
  }

  if (inserted) {
    // add to our log
    await db.execute(
      `INSERT INTO dist_list_log (id, distListId, traceId, action, description) VALUES (?, ?, ?, ?, ?)`,
      [shortId(), distList.id, traceId, 'add', `Added ${inserted} kudos`]
    );
  }

  // close db
  await db.close();

  return { inserted };
};

export const getDistList = async ({ distList }) => {
  const db = await initDb({ distList });
  if (!db) {
    throw new Error('Unable to init db');
  }

  // we want to return a list of grouped by cohort
  const kudos = await db.select(`SELECT * FROM kudos ORDER BY cohort ASC`);
  if (!kudos) {
    throw new Error('Unable to read Kudos File');
  }

  // close db
  await db.close();

  const distListCohorts = {};
  for (const kudo of kudos) {
    if (!kudo.cohort) {
      kudo.cohort = '_default';
    }

    if (!distListCohorts[kudo.cohort]) {
      distListCohorts[kudo.cohort] = [];
    }
    distListCohorts[kudo.cohort].push(kudo);
  }

  return distListCohorts;
};
