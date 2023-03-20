// import chalk from "chalk";
// import { getCohortEntries } from "../lib/kudos.js";
// import { currentCohort } from "../lib/date.js";
import fs from "fs";
import * as child_process from "child_process";
import { promisify } from "util";

import chalk from "chalk";
import _glob from "glob";
const glob = promisify(_glob);
import { v4 as uuidv4 } from "uuid";
import parseAuthor from "parse-author";
import YAML from "yaml";
import path from "path";

// import * as objectSha from "object-sha";

const log = console.log;
const debugLog = console.error;

const exec = async (context) => {
  const flags = context.flags;
  const rootDir = context.input[1];

  // setup flag defaults
  const kudosFile = flags.kudosFile || `kudos.yml`;
  const checks = new Set(
    (flags.checks || "kudos,contributors,lang").split(",")
  );
  const langs = new Set((flags.lang || "nodejs").split(","));

  if (flags.help || !rootDir) {
    console.error(
      `Usage:
 $ ${context.personality} identify [--outFile=STDOUT] [--kudosFile=kudos.yml] [--checks={kudos,contributors,lang}] [--lang={nodejs,go}] [--nodeDevDependencies] SEARCH_DIR`
    );
    process.exit(0);
  }

  // search a path for creators to attribute
  let outData = "";
  let rootDirPath = "";
  let traceId = flags.traceId || uuidv4();
  const creatorContext = { traceId };
  if (flags.contextType) {
    creatorContext.type = flags.contextType;
  }
  if (flags.thing || creatorContext.type) {
    creatorContext.thing = `${flags.thing || creatorContext.type}`;
  }

  try {
    rootDirPath = fs.realpathSync(rootDir);
  } catch (err) {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(0);
  }

  // see if search path exists
  if (!fs.lstatSync(rootDirPath).isDirectory()) {
    console.error(chalk.red("Directory not found:", rootDirPath));
    process.exit(0);
  }

  // plan: we will go through each check type and emit any creators found
  let creators = [];

  const getIdentifierFromHattip = ({ attribution, context }) => {
    // an identifier is something we can validate
    // an attribution is something we can use to construct an identifier
    // not all attributions will be able to return an identifier

    // identifiers are of the form: SCOPE:IDENTIFIER - ex email:matt@mankins.net

    // these are ordered by preference
    if (attribution.identifier) {
      return attribution.identifier; // explicitly set
    }
    if (attribution.email) {
      return `email:${attribution.email}`;
    }
    if (attribution.url) {
      return `url:${attribution.url}`;
    }
    if (attribution.web) {
      return `url:${attribution.web}`;
    }
    if (context.repository?.url) {
      return `repo:${context.repository?.url}`;
    }
    if (attribution["github.url"]) {
      return `repo:${attribution["github.url"]}`;
    }
    if (attribution["github.username"]) {
      return `github:${attribution["github.username"]}`;
    }
    if (attribution["twitter.username"]) {
      return `twitter:${attribution["twitter.username"]}`;
    }
    if (attribution["reddit.username"]) {
      return `reddit:${attribution["reddit.username"]}`;
    }
    if (context.thing) {
      return `thing:${context.thing}`;
    }
    if (attribution.thing) {
      return `thing:${attribution.thing}`;
    }
    if (attribution.name) {
      return `name:${attribution.name}`;
    }
    if (attribution.organization) {
      return `name:${attribution.organization}`;
    }
    if (attribution.company) {
      return `name:${attribution.company}`;
    }

    return;
  };

  const addCreator = (hattip) => {
    const { attribution = {}, context = {}, weight = 1.0 } = hattip;
    let identifier = getIdentifierFromHattip({ attribution, context, weight });
    let creator = {
      identifier,
      context: {
        ...context,
        attribution,
      },
      weight,
      id: uuidv4(),
    };
    if (!creator.description && (context.description || context.thing)) {
      creator.description = context.description || context.thing;
      if (creator.context.description) {
        delete creator.context.description;
      }
    }

    creators.push(creator);
  };

  if (checks.has("kudos")) {
    // look for kudos.yml files
    if (flags.debug) {
      debugLog(chalk.green("Checking for kudos.yml files..."));
    }

    let files = await glob(`${rootDirPath}/**/${kudosFile}`, {
      follow: true, // this can lead to infinite loops. TODO: set a timeout for the whole thing?
    });
    for (let i = 0; i < files.length; i += 1) {
      try {
        const file = files[i];
        const data = fs.readFileSync(file);
        if (flags.debug) {
          console.error("file", file);
        }
        const kudos = YAML.parse(data.toString());
        // for each creator, add to creators list
        for (let j = 0; j < kudos.creators.length; j += 1) {
          const attribution = kudos.creators[j];
          addCreator({
            context: { ...kudos.context, ...creatorContext },
            attribution: { ...kudos.attribution, ...attribution },
            weight: 1 / (kudos.creators.length + 1),
          });
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    }
  }

  // do nodejs specific checks
  if (langs.has("nodejs")) {
    if (flags.debug) {
      debugLog(chalk.green("Checking for nodejs files..."));
    }

    if (checks.has("contributors")) {
      if (flags.debug) {
        debugLog(chalk.green("Checking for contributors..."));
      }

      // look for contributors in package.json files
      if (flags.debug) {
        debugLog(
          chalk.green("Checking for contributors in package.json files...")
        );
      }

      let files = await glob(`${rootDirPath}/**/package.json`, {
        follow: true,
      });
      const packages = {}; // cache of package.json files
      let mainPackage = {};
      const weights = {};
      for (let i = 0; i < files.length; i += 1) {
        try {
          const file = files[i];
          const data = fs.readFileSync(file);
          const pkg = JSON.parse(data.toString());
          pkg._dosku_file = file;
          packages[pkg.name] = pkg;
          if (flags.debug) {
            console.error("file", file, pkg.name);
          }
          if (file === (flags.main || `${rootDirPath}/package.json`)) {
            mainPackage = pkg;
          }
        } catch (err) {
          console.error(err, chalk.red(`Error: ${err.message} - ${files[i]}`));
          if (flags.haltOnError) {
            // lots of garbage in most repos, so don't do this by default
            process.exit(1);
          }
        }
      }

      // build package weights from dependencies
      if (mainPackage && mainPackage.name) {
        const out = child_process.execFileSync(
          flags.packageManager || "pnpm",
          ["ls", "--json", "--depth=0"],
          {
            cwd: rootDirPath,
          }
        );
        let ls = JSON.parse(out.toString());
        // see if ls is an array if so take first element
        // pnpm vs npm difference
        if (Array.isArray(ls)) {
          ls = ls[0];
        }
        // H/T: @flossbank https://github.com/flossbank/registry-resolver/blob/cef71c6c7f50a651a00143cdd1b211d5280d0dd7/index.js#L178
        // weight as it's implemented here is a bit weird: because each contributor
        // gets the package's weight.  So if a package has 10 contributors, rather than each
        // contributor getting 1/10th of the weight, they each get the full weight.
        // This is a bit weird, but it's the best we can do for now.
        // Would like to model this out but I suspect we may get better results with a different
        // more complex/fair weighting algorithm.
        const getWeight = (pkg, weight) => {
          if (flags.debug) {
            debugLog(chalk.blue("getWeight", pkg.name, weight));
          }
        
          if (pkg.name && !weights[pkg.name]) {
            weights[pkg.name] = weight;
            if (flags.debug) {
              debugLog(chalk.blueBright("weight", weights[pkg.name]));
            }
            if (pkg.dependencies) {
              const splitWeight = weight / (Object.keys(pkg?.dependencies).length + 1);
              if (flags.debug) {
                debugLog(chalk.cyan("splitWeight", splitWeight));
              }
              for (const depName in pkg.dependencies) {
                if (flags.debug) {
                  debugLog(chalk.cyan("depName", depName));
                }
                const dep = packages[depName];
                if (dep && dep.name) {
                  getWeight(dep, splitWeight);
                } else {
                  if (flags.debug) {
                    debugLog(chalk.red("no dep"), { dep });
                  }
                }
              }
            }
            if (flags.nodeDevDependencies && pkg.devDependencies) {
              // opt in with --nodeDevDependencies
              const splitWeight = weight / (Object.keys(pkg?.devDependencies).length + 1);
              if (flags.debug) {
                debugLog(chalk.cyan("splitWeight", splitWeight));
              }
              for (const depName in pkg.devDependencies) {
                if (flags.debug) {
                  debugLog(chalk.cyan("depName", depName));
                }
                const dep = packages[depName];
                if (dep && dep.name) {
                  getWeight(dep, splitWeight);
                } else {
                  if (flags.debug) {
                    debugLog(chalk.red("no dep"), { dep });
                  }
                }
              }
            }
          }
        };
        getWeight(ls, 1.0);
        if (flags.debug) {
          debugLog("weights", weights);
        }
      } else {
        // no main package?
        if (flags.debug) {
          debugLog(chalk.red("no main package"));
        }
      }

      // now go through each cached package.json file in packages and search for creators
      for (const pkgName in packages) {
        const pkg = packages[pkgName];
        if (flags.debug) {
          debugLog(chalk.cyan("Checking", pkgName));
        }
        // see if there's no weight
        if (!weights[pkg.name]) {
          // assume this is an extraneous package
          if (flags.debug) {
            debugLog(chalk.red("No weight for", pkg.name));
          }
          continue;
        }
        if (flags.debug) {
          debugLog(chalk.green(`Checking ${pkgName}`));
          debugLog(chalk.yellow(`file: ${pkg._dosku_file}`));
        }

        if (pkg.contributors && Array.isArray(pkg.contributors)) {
          // for each contributor, add to creators list
          for (let j = 0; j < pkg.contributors.length; j += 1) {
            let attribution = pkg.contributors[j];
            // check for string or object
            if (typeof attribution === "string") {
              attribution = parseAuthor(attribution);
            } else if (typeof attribution === "object") {
              // do nothing
            }

            // TODO: make into function to standardize and get as much info as possible out
            // example: if url is a github url, get github username
            // or the weight as well like flossbank does
            // npm view?
            let context = {
              package: pkg.name,
              repository: pkg.repository,
              traceId,
              type: flags.type || "code.lib.nodejs",
            };
            context.thing = `${context.type}.${context.package}`;
            addCreator({
              attribution,
              context,
              weight: weights[pkg.name] || 1.0,
              // it's true that each contributor will get the full weight rather than a split weight
              // based on the number of contributors. We think this may be desirable to change the weights
              // based on the package and not the contributor. But we'll see.
            });
          }
        }
        if (pkg.maintainers && Array.isArray(pkg.maintainers)) {
          // for each maintainers, add to creators list
          for (let j = 0; j < pkg.maintainers.length; j += 1) {
            let attribution = pkg.maintainers[j];

            // check for string or object
            if (typeof contattributionributor === "string") {
              attribution = parseAuthor(attribution);
            }

            let context = {
              package: pkg.name,
              repository: pkg.repository,
              traceId,
              type: flags.type || "code.lib.nodejs",
            };
            context.thing = `${context.type}.${context.package}`;
            addCreator({
              attribution,
              context,
              weight: weights[pkg.name] || 1.0,
            });
          }
        }

        // not common?
        if (pkg.authors && Array.isArray(pkg.authors)) {
          // for each author, add to creators list
          for (let j = 0; j < pkg.authors.length; j += 1) {
            let attribution = pkg.authors[j];

            // check for string or object
            if (typeof attribution === "string") {
              attribution = parseAuthor(attribution);
            }

            let context = {
              package: pkg.name,
              repository: pkg.repository,
              traceId,
              type: flags.type || "code.lib.nodejs",
            };
            context.thing = `${context.type}.${context.package}`;
            addCreator({
              attribution,
              context,
              weight: weights[pkg.name] || 1.0,
            });
          }
        }

        if (pkg.author) {
          if (typeof pkg.author === "string") {
            let attribution;
            try {
              attribution = parseAuthor(pkg.author);
            } catch (e) {
              log(e, { attribution });
            }
            let context = {
              package: pkg.name,
              repository: pkg.repository,
              traceId,
              type: flags.type || "code.lib.nodejs",
            };
            context.thing = `${context.type}.${context.package}`;
            addCreator({
              attribution,
              context,
              weight: weights[pkg.name] || 1.0,
            });
          }
        }
      }
    }
  }

  try {
    // serialize creators as ndjson
    // loop through creators, emit ndjson
    for (let i = 0; i < creators.length; i += 1) {
      const creator = creators[i];
      outData += JSON.stringify(creator) + "\n";
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

export { exec };
