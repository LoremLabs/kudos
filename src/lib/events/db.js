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
const ephemeral = {};

export const addEphemeralEvent = (event) => {
  if (!event.channel) {
    throw new Error('event.channel is required');
  }
  if (!event.address) {
    throw new Error('event.address is required');
  }
  const eventScope = `${event.address}-${event.channel}`;

  // use a Set
  if (!ephemeral[eventScope]) {
    ephemeral[eventScope] = new Set();
  }
  ephemeral[eventScope].add(event);
};

export const initDb = async ({ address = '0x0' }) => {
  console.log('initDb1', address);
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
  startTs = '',
  count = 1,
  direction = 'head',
  channel = '',
  includeEphemeral = false,
}) => {
  console.log('readEvents', {
    address,
    count,
    startTs,
    direction,
    includeEphemeral,
  });

  const db = await initDb({ address });
  if (!db) {
    throw new Error('db is not defined');
  }

  const result = await db.select(
    `SELECT * FROM events WHERE channel = ? AND ts ${
      direction.toLowerCase() === 'head' ? '<' : '>'
    } ? ORDER BY ts ASC LIMIT ?`,
    [channel, startTs, count]
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

  // see if we have any ephemeral events
  if (includeEphemeral) {
    const eventScope = `${address}-${channel}`;
    const ephemeralSet = ephemeral[eventScope];
    if (ephemeralSet) {
      const ephemeralEvents = [...ephemeralSet];
      // console.log({ ephemeralEvents }, 'ephemeralEvents');
      // only include ephemeral events that are in our time range
      const filteredEphemeralEvents = ephemeralEvents.filter((event) => {
        if (direction.toLowerCase() === 'head') {
          return event.ts < startTs;
        } else {
          return event.ts > startTs;
        }
      });
      // console.log({ filteredEphemeralEvents }, 'filteredEphemeralEvents');
      // sort results by ts
      filteredEphemeralEvents.sort((a, b) => {
        if (a.ts < b.ts) {
          return -1;
        } else if (a.ts > b.ts) {
          return 1;
        } else {
          return 0;
        }
      });
      // limit to last count ephemeral events
      filteredEphemeralEvents.splice(0, filteredEphemeralEvents.length - count);
      console.log({ filteredEphemeralEvents }, 'filteredEphemeralEvents');
      // add ephemeral events to result
      result.push(...filteredEphemeralEvents);
    }
  }

  return result;
};
