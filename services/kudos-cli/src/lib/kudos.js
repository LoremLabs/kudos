import chalk from "chalk";

import envPaths from "env-paths";
import fs from "fs";
import mkdirp from "mkdirp";
import Database from "better-sqlite3";
import { currentCohort } from "./date.js";

const paths = envPaths("kudos-cli");

const devLog = process.env.KUDOS_DEBUG === "true" ? console.log : () => {};

const create = async (kudo) => {
  // log(chalk.green('create'));

  // check requirements
  if (!kudo.identifier) {
    throw new Error("identifier is required");
  }

  // setup defaults
  kudo.cohort = kudo.cohort || currentCohort(kudo.createTime);

  kudo.user = kudo.user || 1;
  kudo.weight = kudo.weight || 100; //  100 / n
  if (kudo.weight > 100) {
    kudo.weight = 100;
  }
  kudo.createTime = kudo.createTime || new Date().toISOString();
  kudo.description = kudo.description || "";

  return kudo; // TODO: validate data
};

const initDb = async () => {
  // STEP 1: make sure data directory exists
  const kudosDataDir = paths.data;
  try {
    if (fs.existsSync(kudosDataDir)) {
      //file exists
      devLog(`${kudosDataDir} -> kudosDataDir exists`);
    } else {
      if (kudosDataDir && kudosDataDir.length > 0) {
        const made = mkdirp.sync(kudosDataDir); // die on error
        if (made) {
          devLog(`${kudosDataDir} -> kudosDataDir created`);
        } else {
          devLog(`${kudosDataDir} -> kudosDataDir not created`);
        }
      } else {
        throw new Error("kudosDataDir is not defined");
      }
    }
  } catch (err) {
    throw new Error(err);
  }

  // STEP 2: make sure db exists, return it
  const kudosDbPath = `${kudosDataDir}/kudos.db`;
  const db = new Database(kudosDbPath, {
    readonly: false,
  });

  const statement = `CREATE TABLE IF NOT EXISTS kudos (
    user INT,
    cohort TEXT,
    identifier TEXT, 
    weight FLOAT,   
    create_time DATETIME, 
    description TEXT 
);`;

  db.exec(statement);

  return db;
};

// example implementation of kudos inker
const store = async (kudo) => {
  // make sure paths exist, db initialized
  const db = await initDb();

  const statement = `INSERT INTO kudos (user, cohort, identifier, weight, create_time, description) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [
    kudo.user,
    kudo.cohort,
    kudo.identifier,
    (parseFloat(kudo.weight) || 100) / 100,
    kudo.createTime,
    kudo.description,
  ];
  const result = db.prepare(statement).run(values);
  if (result) {
    devLog(chalk.green("stored"));
  }
  db.close();
  return result ? true : false;
};

const getCohort = async ({ user = 1, cohort }) => {
  const db = await initDb();

  const statement = `select count(*) as transactions, sum(weight) as cohortWeight, identifier, cohort from kudos where cohort = ? and user = ? group by identifier`;
  const values = [cohort, user];
  const result = db.prepare(statement).all(values);
  return result;
};

const resetCohort = async ({ user = 1, cohort }) => {
  const db = await initDb();

  const statement = `delete from kudos where cohort = ? and user = ?`;
  const values = [cohort, user];
  return db.prepare(statement).run(values);
};

export { create, getCohort, resetCohort, store };
