import SQLite from "tauri-plugin-sqlite-api";

// const readKudosDb = async ({ dbFile }) => {
//     return [];
// };


const readKudosDb = async ({ dbFile }) => {
    console.log("dbFile", { dbFile });
    const db = await SQLite.open(dbFile);
  if (!dbFile) {
    throw new Error("dbFile is not defined");
  }
  console.log("dbFile", { dbFile, db });
  const exists = await db.select(`SELECT name FROM sqlite_master WHERE type='table' AND name='kudos'`);
  if (!exists || exists.length === 0) {
    throw new Error("not a valid kudos database");
  }
  console.log("exists", { exists });
  const result = await db.select(
    `SELECT identifier, cohort, weight, createTime, description, id, context
    FROM kudos ORDER BY createTime ASC`
  );
  //.where("cohort", "=", `${cohort}`)
  //.where("user", "=", user)
  // .orderBy("createTime", "asc");

  // iterate through result, JSON.parse context
  result.forEach((row) => {
    try {
      row.context = JSON.parse(row.context);
    } catch (e) {
      // TODO: throw error/event
      console.log("error parsing context", { row, e });
    }
  });

  // db.destroy();
  const isClosed = await db.close();

  return result;
};

export { readKudosDb };
