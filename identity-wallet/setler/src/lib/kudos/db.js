import SQLite from 'tauri-plugin-sqlite-api';
import { readBinaryFile, readTextFile } from '@tauri-apps/api/fs';

// const readKudosDb = async ({ dbFile }) => {
//     return [];
// };

const readKudosDb = async ({ dbFile }) => {
  console.log('dbFile', { dbFile });
  // read dbFile
  // all data, newline delimited json
  const file = await readTextFile(dbFile);
  // parse the data as json, converting from buffer to text
  const data = file.toString();

  // split the data into lines
  const lines = data.split('\n');
  console.log('lines', lines);

  // for each
  // parse the line as json
  // add to array
  const result = lines.map((line) => {
    let row = {};
    try {
      row = JSON.parse(line);
      row.context = line;
      row.weight = row.weight || 1;
    } catch (e) {
      console.log('error parsing line', { line, e });
      return null;
    }
    return row;
  });
  console.log({ result });

  console.log({ result });
  return result;
  // const parsed = JSON.parse(file.toLocaleString());
  // console.log('file', parsed);
  // const db = await SQLite.open(dbFile);
  // if (!dbFile) {
  //   throw new Error('dbFile is not defined');
  // }
  // console.log('dbFile', { dbFile, db });
  // const exists = await db.select(
  //   `SELECT name FROM sqlite_master WHERE type='table' AND name='kudos'`
  // );
  // if (!exists || exists.length === 0) {
  //   throw new Error('not a valid kudos database');
  // }
  // console.log('exists', { exists });
  // const result = await db.select(
  //   `SELECT identifier, cohort, weight, createTime, description, id, context
  //   FROM kudos ORDER BY createTime ASC`
  // );
  // //.where("cohort", "=", `${cohort}`)
  // //.where("user", "=", user)
  // // .orderBy("createTime", "asc");

  // // iterate through result, JSON.parse context
  // result.forEach((row) => {
  //   try {
  //     row.context = JSON.parse(row.context);
  //   } catch (e) {
  //     // TODO: throw error/event
  //     console.log('error parsing context', { row, e });
  //   }
  // });

  // // db.destroy();
  // const isClosed = await db.close();

  // return result;
};

export { readKudosDb };
