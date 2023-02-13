import {
  BaseDirectory,
  createDir,
  exists,
  readTextFile,
  writeFile,
} from '@tauri-apps/api/fs';

import SQLite from 'tauri-plugin-sqlite-api';
import { appLocalDataDir } from '@tauri-apps/api/path';

const cache = {};

export const initDb = async ({ address = '0x0' }) => {
  console.log('initDb', { address });
  const baseDir = await appLocalDataDir();
  await createDir(`${baseDir}state`, {
    recursive: true,
  });

  const dbFullPath = `${baseDir}state/events-${address}.db`;
  //console.log('dbFullPath', dbFullPath);
  // "/Users/mattmankins/Library/Application Support/com.tauri.dev/state/events-0x0.db
  const db = await SQLite.open(dbFullPath);

  // only init once per session (or time period?)
  // @ts-ignore
  if (cache[`db-${address}`]) {
    return db;
  }
  cache[`db-${address}`] = Date.now();

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
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY UNIQUE,
        type TEXT NOT NULL,
        channel TEXT NOT NULL,
        event TEXT NOT NULL,
        ts DATETIME DEFAULT ((DATETIME(CURRENT_TIMESTAMP, 'LOCALTIME')))
    );
    CREATE INDEX IF NOT EXISTS idx_channel ON events ('channel');
    CREATE INDEX IF NOT EXISTS idx_type ON events ('type');
    CREATE INDEX IF NOT EXISTS idx_ts ON events ('ts');    
`);

  return db;
};

// @ts-ignore
export const addEvents = async ({ address = '0x0', events = [] }) => {
  const db = await initDb({ address });
  if (!db) {
    throw new Error('db is not defined');
  }

  // start transaction
  await db.execute(`BEGIN TRANSACTION`);

  for (const event of events) {
    console.log({ event }, 'inserting event');
    await db.execute(
      `INSERT OR IGNORE INTO events (id, type, channel, event, ts) VALUES (?, ?, ?, ?, ?)`,
      [event.id, event.type, event.channel, JSON.stringify(event), event.ts]
    );
  }

  // commit transaction
  return await db.execute(`END TRANSACTION`);
};

export const readEvents = async ({
  address = '0x0',
  startTs,
  count = 1,
  ledgerAddress = '0x0',
  direction = 'ASC',
}) => {
  console.log('readEvents', { address });

  const db = await initDb({ address });
  if (!db) {
    throw new Error('db is not defined');
  }

  // console.log(
  //   `SELECT * FROM events WHERE ts ${
  //     direction.toLowerCase() === 'earlier' ? '<' : '>'
  //   } ${startTs} ORDER BY ts ${
  //     direction.toLowerCase() === 'earlier' ? 'DESC' : 'ASC'
  //   } LIMIT ${count}}`
  // );
  const result = await db.select(
    `SELECT * FROM events WHERE ts ${
      direction.toLowerCase() === 'earlier' ? '<' : '>'
    } ? ORDER BY ts ${
      direction.toLowerCase() === 'earlier' ? 'DESC' : 'ASC'
    } LIMIT ?`,
    [startTs, count]
  );
  // console.log({ result }, 'result');
  // iterate through result, JSON.parse context
  result.forEach((row) => {
    try {
      row.event = JSON.parse(row.event);
    } catch (e) {
      // TODO: throw error/event
      console.log('error parsing event', { row, e });
    }
  });

  // db.destroy();
  const isClosed = await db.close();

  return result;
};
