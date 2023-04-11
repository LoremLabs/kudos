import fs from "fs";
import chalk from "chalk";
import readline from "readline";

import { create, store, done } from "../lib/kudos.js";
import { normalizeIdentifier } from "../lib/identifiers.js";

const log = console.log;
// const devLog = process.env.KUDOS_DEBUG === "true" ? console.log : () => {};

const help = () => {
  log(
    `Usage: dosku ink [<STDIN:ndjson>] [twitter:identifier] [--weight=1] [--createTime=now] [--src=cli] [--description=""] [--scope=twitter] [--dbDir=./db] [--verbose]

Example NDJSON import from previous list:
    cat /tmp/abc | jq -cM '.entries[]' | dosku ink
    `
  );
  process.exit(0);
};

const exec = async (context) => {
  const flags = context.flags;
  if (flags.help) {
    return help();
  }
  const dbDir = flags.dbDir
    ? flags.dbDir
    : context.config.get(`${context.personality}.dbDir`);

  if (context.input[1]) {
    // we have an identifier something of the form twitter:mankins or @mankins or mankins with --scope=twitter
    const kudoData = {}; // no such thing as a kudo, except here, a singular kudos h/t @stpeter
    kudoData.createTime = flags.createTime
      ? new Date(flags.createTime).toISOString()
      : new Date().toISOString(); // '2022-03-07T10:27:27.718Z'
    kudoData.weight = parseFloat(flags.weight);
    if (isNaN(kudoData.weight)) {
      kudoData.weight = 1;
    }
    kudoData.src = flags.src ? flags.src : context.personality || "cli";
    kudoData.description = flags.description ? flags.description : "";
    kudoData.context = flags.context
      ? flags.context
      : context.config.get(`kudos.context`) || "";

    try {
      kudoData.identifier = normalizeIdentifier(context.input[1], {
        DEFAULT_SCOPE: flags.scope,
      });
    } catch (e) {
      log(
        chalk.red(
          `Identifier format error: ${kudoData.identifier}\n\n\t${e.message}`
        )
      );
      process.exit(2);
    }
    const kudo = await create({ kudo: kudoData });
    if (flags.verbose) {
      log(
        chalk.green(
          `Kudos ${kudo.identifier} created at ${kudo.createTime} [${kudo.weight}]`
        )
      );
    }
    await store({ kudo, dbDir });
    done();
  } else if (flags.inFile || context.stdin) {
    let dataRead = false;
    let input = process.stdin;

    // check to see if flags.inFile exists
    if (flags.inFile) {
      if (fs.existsSync(flags.inFile)) {
        //file exists
        input = fs.createReadStream(flags.inFile);
      } else {
        log(chalk.red(`File not found: ${flags.inFile}`));
        process.exit(2);
      }
    }

    const rl = readline.createInterface({
      input,
      // output: process.stdout,
      terminal: false,
    });

    let chunkBuffer = "";
    rl.on("line", async (chunk) => {
      dataRead = true;
      try {
        log(chalk.green(`Kudos ${chunk} read`));
        // const jsonRows = chunk
        //   .toString()
        //   .split(/\n|\n\r/)
        //   .filter(Boolean);
        // const rows = jsonRows.map((jsonStringRow) => JSON.parse(jsonStringRow));
        //log({jsonRows, rows});
        let rows;
        chunkBuffer = chunkBuffer + chunk;
        try {
          rows = [JSON.parse(chunk)];
        } catch (e) {
          log(chalk.red(`Error parsing JSON: ${chunk}`));
          return;
        }
        chunkBuffer = "";
        for (const kudoData of rows) {
          try {
            kudoData.identifier = normalizeIdentifier(kudoData.identifier, {
              DEFAULT_SCOPE: flags.scope,
            });
          } catch (e) {
            log(
              chalk.red(
                `Identifier format error: ${kudoData.identifier}\n\n\t${e.message}`
              )
            );
            // process.exit(2);
          }
          // log(kudoData);
          try {
            const kudo = await create({ kudo: kudoData, dbDir }); // TODO: flag to skip on errors
            if (flags.verbose) {
              log(
                chalk.green(
                  `Kudos ${kudo.identifier} created at ${kudo.createTime} [${kudo.weight}]`
                )
              );
            }
            log(chalk.white(JSON.stringify(kudo)));
            await store({ kudo, dbDir });
          } catch (ee) {
            log(chalk.red(`Error creating kudo: ${ee.message}`));
          }
        }
      } catch (e) {
        log(chalk.red(e.message), e);
        process.exit(1);
      }
    });
    rl.once("close", () => {
      if (!dataRead && !flags.inFile) {
        help();
      }
      done();
    });
  }
};

export { exec, help };
