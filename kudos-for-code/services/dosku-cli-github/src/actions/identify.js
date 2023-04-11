// @ts-check
import fs from "fs";
import chalk from "chalk";
import { v4 as uuidv4 } from "uuid";
import { getRepository } from "../lib/get-repo.js";
import { getIdentifierFromHattip } from "../lib/identifiers.js";
import { getContributors } from "../lib/api/contributors.js";

const log = console.log;
const debugLog = console.error;

export const exec = async context => {
  const repository = getRepository(context);
  if (!repository) {
    throw new Error("Missing repository in context/input");
  }

  const flags = context.flags;

  // setup flag defaults
  const checks = new Set((flags.checks || "contributors").split(","));
  const githubToken = process.env.GH_TOKEN; // should be available via other means?

  if (flags.help) {
    console.error(
      `Usage:
 $ ${context.personality} identify [--outFile=STDOUT] [--checks={contributors}] [OWNER/REPOSITORY]`
    );
    process.exit(0);
  }

  // search a path for creators to attribute
  let outData = "";
  let traceId = flags.traceId || uuidv4();
  const creatorContext = { traceId };
  if (flags.contextType) {
    creatorContext.type = flags.contextType;
  }
  if (flags.thing || creatorContext.type) {
    creatorContext.thing = `${flags.thing || creatorContext.type}`;
  }

  // plan: we will go through each check type and emit any creators found
  let contributors = [];

  const addContributor = hattip => {
    const { attribution = {}, context = {}, weight = 1.0 } = hattip;
    const identifier = getIdentifierFromHattip({ attribution, context });
    const contributor = {
      identifier,
      context: {
        ...context,
        attribution,
      },
      weight,
      id: uuidv4(),
    };
    if (!contributor.description && (context.description || context.thing)) {
      contributor.description = context.description || context.thing;
      if (contributor.context.description) {
        delete contributor.context.description;
      }
    }

    contributors.push(contributor);
  };

  // do nodejs specific checks
  if (checks.has("contributors")) {
    if (flags.debug) {
      debugLog(chalk.green("Checking for GitHub contributors..."));
    }

    const contributors = await getContributors(repository, githubToken);

    const total = contributors.reduce((s, c) => s + c.contributions, 0) || 1;
    for (const contributor of contributors) {
      const attribution = { "github.username": contributor.login };
      const weight = contributor.contributions / total;

      const context = {
        repository: {
          type: "git",
          url: `git+https://github.com/${repository}.git`,
        },
        traceId,
        type: flags.type || "code.repository",
      };
      context.thing = `${context.type}.${context.repository.url}`;

      addContributor({ attribution, context, weight });
    }
  }

  try {
    // serialize contributor as ndjson
    for (const contributor of contributors) {
      outData += JSON.stringify(contributor) + "\n";
    }
  } catch (e) {
    log(e, "error serializing creators");
  }

  if (flags.outFile) {
    fs.writeFileSync(flags.outFile, outData);
  } else {
    log(outData);
  }
  process.exit(0);
};
