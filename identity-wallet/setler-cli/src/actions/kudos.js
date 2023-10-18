import * as child_process from "child_process";

import YAML from "yaml";
import _glob from "glob";
import chalk from "chalk";
import { creatorPool } from "../kudos.js";
import { detectStringTypes } from "../lib/detect.js";
import fs from "fs";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import { getExchangeRate } from "../lib/wallet/getExchangeRate.js";
import { gzipSync } from "node:zlib";
import { notifyEscrow } from "../lib/escrow.js";
import parseAuthor from "parse-author";
import { promisify } from "util";
import prompts from "prompts";
import { shortId } from "@kudos-protocol/short-id";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";
import windowSize from "window-size";
import { convertStringToHex, xrpToDrops } from "xrpl";
import { getSubjectPayVia, lookupMetadata } from "@kudos-protocol/subject-hash";

// import { waitFor } from "../lib/wait.js";

const glob = promisify(_glob);

const log = console.log;
const debugLog = console.error;

const help = () => {
  log("Usage: setler kudos [command] [options]");
  log("");
  log("Commands:");
  log("  keys");
  log("  create");
  log("  list");
  log("  send");
  log(
    "  identify [path] [--skipMainPackage] [--checks] [--lang] [--outFile] [--nodeDevDependencies] [--quiet]"
  );
  log("");
  log("Options:");
  log(
    "  --profile <profile> - default: 0, 1, 2, ... Same mnemonic, different keys"
  );
  log(
    "  --wallet <wallet> - default: 0, 1, 2, ... Different mnemonic, different keys"
  );
  log("  --passPhrase <passPhrase> - default: ''");
  log("  --yes - default: false");
  log("");
  log("Examples:");
  log("  setler kudos keys --json --profile 0");
  log("  setler kudos address");
  log("  setler kudos create");
  log("  setler kudos identify .");
  log(
    "  setler kudos send [--url kudosurl] [--poolId abcd123] [--frozenPoolId abcd123]"
  );
  log("  setler kudos list --poolId abcd123");
  log("");
  log("Kudos to kudos:");
  log("");
  log("  Remove kudos sent to setler team with");
  log("  setler kudos send --dontSendKudosToSetlerTeam"); // by why would you want to, ha
  log("");

  process.exit(1);
};

// run sub command
const exec = async (context) => {
  const network = context.flags.network || "kudos";
  const { flags } = context;

  switch (context.input[1]) {
    case "identify": {
      // see what creators we can identifiy

      const rootDir = context.input[2];

      // setup flag defaults
      const kudosFile = flags.kudosFile || `kudos.yml`;
      const DEFAULT_CHECKS = "kudos,contributors,lang"; // TODO: add github?
      const checks = new Set((flags.checks || DEFAULT_CHECKS).split(","));
      const langs = new Set((flags.lang || "nodejs").split(","));
      if (flags.help || !rootDir) {
        console.error(
          `Usage:
 $ setler kudos identify SEARCH_DIR [--outFile=STDOUT] [--kudosFile=kudos.yml] [--checks={kudos,contributors,lang}] [--lang={nodejs,go}] [--nodeDevDependencies]`
        );
        process.exit(0);
      }

      // search a path for creators to attribute
      let outData = "";
      let rootDirPath = "";
      let traceId = flags.traceId || shortId();
      const creatorContext = {};
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
          // see if it's a url we know about
          // if it's twitter, convert to twitter:username
          // if it's github, convert to github:username, etc

          if (attribution.url && attribution.url.match(/twitter.com/)) {
            const username = attribution.url.replace(
              /^https?:\/\/(www.)?twitter.com\//,
              ""
            );
            return `twitter:${username.toLowerCase()}`;
          } else if (attribution.url && attribution.url.match(/github.com/)) {
            const username = attribution.url.replace(
              /^https?:\/\/(www.)?github.com\//,
              ""
            );
            return `github:${username.toLowerCase()}`;
          } else if (attribution.url && attribution.url.match(/reddit.com/)) {
            const username = attribution.url.replace(
              /^https?:\/\/(www.)?reddit.com\/user\//,
              ""
            );
            return `reddit:${username.toLowerCase()}`;
          } else {
            return `url:${attribution.url}`;
          }
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

        // TODO:
        // "funding": [
        //   {
        //     "type": "individual",
        //     "url": "https://gitcoin.co/grants/13/ethersjs-complete-simple-and-tiny-2"
        //   },
        //   {
        //     "type": "individual",
        //     "url": "https://www.buymeacoffee.com/ricmoo"
        //   }
        // ],

        return;
      };

      const addCreator = (hattip) => {
        const { attribution = {}, context = {}, weight = 1.0 } = hattip;
        let identifier = getIdentifierFromHattip({
          attribution,
          context,
          weight,
        });

        if (!identifier) {
          return;
        }

        let ts = new Date().toISOString();
        // remove ms
        ts = ts.replace(/\.\d{3}Z$/, "Z");

        // actually create the kudo
        let kudo = {
          identifier,
          weight: weight.toFixed(6),
          id: shortId(),
          traceId,
          ts,
        };
        if (flags.useContext) {
          // extra debugging info
          kudo.context = {
            attribution,
            ...context,
          };
        }

        if (!kudo.description && (context.description || context.thing)) {
          kudo.description = context.description || context.thing;

          if (kudo.context?.description) {
            delete kudo.context.description;
          }
        }

        creators.push(kudo);
      };

      if (checks.has("github")) {
        // TODO: move github identify here.
        // setler kudos identify . --checks=github ...
      }
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
              if (flags.debug) {
                pkg._kudos_file = file;
              }
              packages[pkg.name] = pkg;
              if (flags.debug) {
                console.error("file", file, pkg.name);
              }
              if (file === (flags.main || `${rootDirPath}/package.json`)) {
                mainPackage = pkg;
              }
            } catch (err) {
              if (flags.debug) {
                console.error(
                  err,
                  chalk.red(`Error: ${err.message} - ${files[i]}`)
                );
              }
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

              if (
                pkg.name &&
                (!weights[pkg.name] || weights[pkg.name] < weight)
              ) {
                if (flags.skipMainPackage && pkg.name === mainPackage.name) {
                  if (flags.debug) {
                    debugLog(chalk.yellow("skipping main package", pkg.name));
                  }
                  weights[pkg.name] = 0;
                } else {
                  weights[pkg.name] = weight;
                }
                if (flags.debug) {
                  debugLog(chalk.blueBright("weight", weights[pkg.name]));
                }
                let totalDependencies = 0;
                if (pkg.dependencies) {
                  totalDependencies += Object.keys(pkg?.dependencies).length;
                }
                if (flags.nodeDevDependencies && pkg.devDependencies) {
                  totalDependencies += Object.keys(pkg?.devDependencies).length;
                }
                if (flags.debug) {
                  debugLog(chalk.cyan("totalDependencies", totalDependencies));
                  // process.exit();
                }
                let splitWeight = 1;
                if (totalDependencies > 0) {
                  splitWeight = weight / totalDependencies;
                }

                if (pkg.dependencies) {
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
              debugLog("ls", ls);
              debugLog("weights", weights);
            }
            // weights is now a map of package names to weights as values
            const totalWeights = Object.values(weights).reduce(
              (a, b) => a + b,
              0
            );
            if (!flags.quiet) {
              log(weights);
            }
            if (flags.debug) {
              debugLog("totalWeights", totalWeights);
            }
            if (totalWeights <= 0) {
              log(
                chalk.red(
                  `no kudos identified. verify you've run\n ${
                    flags.packageManager || "pnpm"
                  } i\n`
                )
              );
              process.exit(1);
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
              debugLog(chalk.cyan("Checking a", pkgName));
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
              debugLog(chalk.green(`Checking b ${pkgName}`));
              debugLog(chalk.yellow(`file: ${pkg._kudos_file}`));
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
                  //                  traceId,
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
                  //                  traceId,
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
                  //                  traceId,
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
                  //                  traceId,
                  type: flags.type || "code.lib.nodejs",
                };
                context.thing = `${context.type}.${context.package}`;
                context.description = `author of ${pkg.name} used in ${mainPackage.name}`;
                addCreator({
                  attribution,
                  context,
                  weight: weights[pkg.name] || 1.0,
                });
              } else if (typeof pkg.author === "object") {
                if (pkg.author?.email) {
                  let attribution = pkg.author;
                  let context = {
                    package: pkg.name,
                    repository: pkg.repository,
                    //                    traceId,
                    type: flags.type || "code.lib.nodejs",
                  };
                  context.thing = `${context.type}.${context.package}`;
                  context.description = `author of ${pkg.name} used in ${mainPackage.name}`;
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
      }

      // TODO: do this in chunks
      try {
        // serialize creators as ndjson
        // loop through creators, emit ndjson
        for (let i = 0; i < creators.length; i += 1) {
          const creator = creators[i];
          if (creator.weight > 0) {
            outData += JSON.stringify(creator) + "\n";
          } else {
            if (flags.debug) {
              debugLog(
                chalk.red("skipping, weight <= 0", JSON.stringify(creator))
              );
            }
          }
        }
      } catch (e) {
        log(e, "error serializing creators");
      }

      // we want to output it here
      if (flags.gzip) {
        outData = gzipSync(outData).toString("base64");
      }

      if (flags.outFile) {
        let flag = "a"; // default append
        if (flags.gzip || flags.overwrite) {
          // if we're gzipping, we're overwriting TODO: should we warn?
          flag = "w"; // overwrite
        }
        fs.writeFileSync(flags.outFile, outData, { flag });
      } else {
        log(outData);
      }
      break;
    }
    case "create": {
      await gatekeep(context, true, { networks: ["kudos"] });

      let outData = "";
      let creators = [];
      let traceId = flags.traceId || shortId();
      // ts = iso date no ms
      const ts = new Date().toISOString().replace(/\.\d+Z$/, "Z");

      let askForMore = true;
      if (flags.identifier && flags.now) {
        askForMore = false;

        if (!Array.isArray(flags.identifier)) {
          flags.identifier = [flags.identifier];
        }
        for (let i = 0; i < flags.identifier.length; i += 1) {
          const identifier = flags.identifier[i];
          const weight = flags.weight || 1.0;
          const description = flags.description || undefined;
          const kudos = {
            identifier,
            id: shortId(),
            ts,
            weight,
            description,
            traceId,
          };
          creators.push(kudos);
        }
      }

      while (askForMore) {
        const response = await prompts([
          {
            message: "Identifier type?",
            type: "select",
            name: "subjectType",
            choices: [
              {
                title: "email",
                description: "Email address",
                value: "email",
              },
              {
                title: "twitter",
                value: "twitter",
                disabled: true,
                description: "Twitter username.",
              },
              {
                title: "github",
                value: "github",
                disabled: true,
                description: "GitHub handle.",
              },
              {
                title: "did",
                value: "did",
                disabled: true,
                description: "DID (decentralized identifier).",
              },
            ],
            initial: 0,
          },
          {
            type: (prev) => {
              const type = prev === "email" ? "text" : null;
              return type;
            },
            name: "email",
            message:
              "Email address? " +
              chalk.grey(`(example: email@domain.com)`) +
              " ?",
            initial: context.flags.email || "",
            validate: (maybeEmail) => {
              // allow empty to skip
              if (maybeEmail === "") {
                return true;
              }

              // does this seem like an email?
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(maybeEmail);
            },
          },
          {
            type: (prev) => {
              const type = prev === "twitter" ? "text" : null;
              return type;
            },
            name: "twitter",
            message:
              "Twitter handle? " + chalk.grey(`(example: @handle)`) + " ?",
            initial: context.flags.twitter || "",
            validate: (maybeTwitter) => {
              // allow empty to skip
              if (maybeTwitter === "") {
                return true;
              }

              // does this seem like an email?
              const twitterRegex = /^@?(\w){1,15}$/;
              return twitterRegex.test(maybeTwitter);
            },
          },
          {
            type: (prev) => {
              const type = prev === "github" ? "text" : null;
              return type;
            },
            name: "github",
            message:
              "GitHub handle? " + chalk.grey(`(example: @handle)`) + " ?",
            initial: context.flags.github || "",
            validate: (maybeGithub) => {
              // allow empty to skip
              if (maybeGithub === "") {
                return true;
              }

              // does this seem like an email?
              const githubRegex = /^@?(\w){1,39}$/;
              return githubRegex.test(maybeGithub);
            },
          },
          {
            type: (prev) => {
              const type = prev === "did" ? "text" : null;
              return type;
            },
            name: "did",
            message:
              "DID? " + chalk.grey(`(example: did:web:example.com)`) + " ?",
            initial: context.flags.did || "",
            validate: (maybeDid) => {
              // allow empty to skip
              if (maybeDid === "") {
                return true;
              }

              // does this seem like a did?
              const didRegex = /^did:(\w+):(\w+)$/;
              return didRegex.test(maybeDid);
            },
          },
          {
            type: "number",
            name: "weight",
            message: "Weight? " + chalk.grey(`(default: 1.0)`) + " ?",
            initial: 1.0,
            validate: (maybeWeight) => {
              // allow empty to skip
              if (maybeWeight === "") {
                return true;
              }

              if (typeof maybeWeight !== "number") {
                return false;
              }

              return maybeWeight > 0 && maybeWeight <= 1;
            },
          },
          {
            type: "text",
            name: "description",
            message: "Description? " + chalk.grey(`(optional)`) + " ?",
            initial: "",
          },
          {
            type: "confirm",
            name: "ok",
            message: "Another? ",
            initial: true,
          },
        ]);

        let identifier = "";
        switch (response.subjectType) {
          case "email":
            identifier = `email:${response.email.trim().toLowerCase()}`;
            break;
          case "twitter": {
            let twitter = response.twitter.trim().toLowerCase();
            if (twitter.startsWith("@")) {
              twitter = twitter.slice(1);
            }

            identifier = `twitter:${twitter}`;
            break;
          }
          case "github": {
            let github = response.github.trim().toLowerCase();
            if (github.startsWith("@")) {
              github = github.slice(1);
            }

            identifier = `github:${github}`;
            break;
          }
          case "did": {
            identifier = response.did.trim();
            break;
          }
          default:
            throw new Error(`Unknown identifier type: ${response.subjectType}`);
        }

        let description = response.description.trim();
        if (description === "") {
          description = undefined;
        }

        const weight = parseFloat(response.weight).toFixed(6);

        const kudos = {
          ts,
          traceId,
          id: shortId(),
          identifier,
          description,
          weight,
        };

        creators.push(kudos);

        if (!response.ok) {
          askForMore = false;
          break;
        }
        log("");
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
        let flag = "a"; // default append
        if (flags.gzip || flags.overwrite) {
          // if we're gzipping, we're overwriting TODO: should we warn?
          flag = "w"; // overwrite
        }
        fs.writeFileSync(flags.outFile, outData, { flag });
      } else {
        log(outData);
      }

      break;
    }
    case "address": {
      await gatekeep(context, true);

      if (!context.keys) {
        context.keys = await context.vault.keys();
      }

      // print the address
      if (context.flags.json) {
        log(JSON.stringify({ address: context.keys.kudos.address }));
      } else {
        log(`${context.keys.kudos.address}`);
        log(stringToColorBlocks(context.keys.kudos.address, network));
      }
      break;
    }
    case "keys": {
      await gatekeep(context, true);

      if (!context.keys) {
        context.keys = await context.vault.keys();
      }

      if (context.flags.json) {
        log(JSON.stringify({ kudos: context.keys.kudos }));
      } else {
        // output: export KUDOS_1=Base64EncodedJSON
        // base64Url encode
        const kudosKeysExportBase64 = Buffer.from(
          JSON.stringify({ kudos: context.keys.kudos })
        ).toString("base64url");

        log(
          `SETLER_KEYS_${
            parseInt(context.wallet, 10) ? context.wallet + "_" : ""
          }${context.profile}="${kudosKeysExportBase64}"`
        );
      }
      break;
    }
    case "list": {
      await gatekeep(context, false, { networks: ["kudos"] });

      const kudosNetwork = context.flags.kudosNetwork || "kudos";
      const keys = await context.vault.keys();

      let kudosAddress = flags.kudosAddress || keys[kudosNetwork].address;

      if (!kudosAddress) {
        log(chalk.red(`send: no account found for kudos network`));
        process.exit(1);
      }

      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        let matching = context.flags.poolMatch || "";

        if (context.flags.poolName) {
          matching = context.flags.poolName;

          if (Array.isArray(matching)) {
            log(chalk.red(`Can only specify one pool name`));
            process.exit(1);
          }

          // add n: prefix if it's not already there
          if (!matching.startsWith("n:")) {
            matching = "n:" + matching;
          }
        } else if (context.flags.poolId) {
          matching = context.flags.poolId;

          if (Array.isArray(matching)) {
            log(chalk.red(`Can only specify one pool id`));
            process.exit(1);
          }

          // add i: prefix if it's not already there
          if (!matching.startsWith("i:")) {
            matching = "i:" + matching;
          }
        }

        let listResults = {};
        try {
          const listPromise = context.auth.listPools({
            network: kudosNetwork,
            matching,
          });
          listResults = await waitFor(listPromise, {
            text: `Fetching pools...`,
          });
        } catch (error) {
          log(chalk.red(`Error listing pools: ${error.message}`));
          process.exit(1);
        }

        const out = JSON.parse(listResults.response.out);
        // log(`${JSON.stringify(out, null, 2)}`);
        // out.pools is an array of {id,name}
        // use that to construct a prompt

        let choices = out.pools.map((pool) => {
          return {
            title: `${pool.name}`,
            description: `[${pool.id}]`,
            value: pool.id,
          };
        });
        // sort choices by title alphabetically
        choices = choices.sort((a, b) => {
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        });

        if (choices.length === 0) {
          log(chalk.red(`No pools found`));
          process.exit(1);
        }

        // prompt for poolId
        const response = await prompts({
          type: "select",
          name: "poolId",
          message: "What poolId do you want to send to?",
          choices,
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
        process.exit(1);
      }

      // get the pool
      let getResults = {};
      try {
        const getPromise = context.auth.getPoolSummary({
          network: kudosNetwork,
          address: kudosAddress,
          poolId,
          frozenPoolId: context.flags.frozenPoolId || "",
        });
        getResults = await waitFor(getPromise, {
          text: `Retrieving pool...`,
        });
      } catch (error) {
        log(chalk.red(`Error getting pool: ${error.message}`));
        process.exit(1);
      }

      const out = JSON.parse(getResults.response.out);
      log(`${JSON.stringify(out, null, 2)}`);

      break;
    }
    case "send": {
      await gatekeep(context);

      let network =
        context.flags.network || context.config.network || "xrpl:testnet";
      network = network.replace("-", ":"); // nonsense
      const kudosNetwork = context.flags.kudosNetwork || "kudos";
      const keys = await context.vault.keys();

      // convert xrpl:testnet to keys[xrpl][testnet]
      let sourceAddress;
      const networkParts = network.split(":");
      if (networkParts.length === 1) {
        sourceAddress = keys[network].address;
      } else {
        sourceAddress = keys[networkParts[0]][networkParts[1]].address;
      }

      let kudosAddress = flags.kudosAddress || keys[kudosNetwork].address;

      if (!sourceAddress) {
        log(chalk.red(`send: no account found for network ${network}`));
        process.exit(1);
      }

      if (!kudosAddress) {
        log(chalk.red(`send: no account found for kudos network`));
        process.exit(1);
      }

      let amount = parseFloat(context.flags.amount).toFixed(6).toString();
      if (!amount || parseFloat(amount).toString() === "NaN") {
        // ask for the amount
        log("");
        const response = await prompts([
          {
            type: "text",
            name: "amount",
            message: `Enter the amount to send in XRP: `,
            initial: false,
          },
        ]);
        amount = response.amount;
      }

      if (!amount || parseFloat(amount).toString() === "NaN") {
        log(chalk.red("Amount is required"));
        process.exit(1);
      }

      const amountXrp = parseFloat(amount); // takes care of scientific notation?

      // convert the amount into drops
      const drops = parseFloat(amountXrp) * 1000000;
      log(chalk.gray(`\tAmount in drops: \t${drops.toLocaleString()}`));

      const addresses = [];
      const weights = [];
      const kudosMemos = [];
      let kudosCreatorsAdded = false;
      let shouldAddKudosCreators = context.flags.dontSendKudosToSetlerTeam
        ? false
        : true; // defaults to send kudos to setler team

      if (context.flags.to) {
        let kudosMemo = {};
        let address = context.flags.to; // email:matt@...
        let weight = 1.0;

        kudosMemos.push(kudosMemo);
        addresses.push(address);
        weights.push(weight);
      } else if (context.flags.url) {
        // fetch url
        const url = context.flags.url;
        const response = await fetch(url);

        // handle errors
        if (!response.ok) {
          log(chalk.red(`Error fetching url: ${response.statusText}`));
          process.exit(1);
        }

        // check that the mime type is application/x-ndjson
        // const contentType = response.headers.get("content-type");
        // if (!contentType || !contentType.startsWith("application/x-ndjson")) {
        //   log(
        //     chalk.red(
        //       `Error fetching url: expected application/x-ndjson, got ${contentType}`
        //     )
        //   );
        //   process.exit(1);
        // }

        let pool = [];
        const text = await response.text();
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];

          try {
            const kudo = JSON.parse(line);
            pool.push(kudo);
          } catch (e) {
            if (flags.fail) {
              log(chalk.red(`Error parsing line ${i}: ${e.message}`));
              process.exit(1);
            }
            // ignore
            log(
              chalk.red(`Error parsing line ${i}: ${e.message}...Continuing...`)
            );
          }
        }

        const stackResults = {};
        // now summarize
        let totalWeight = Object.values(pool).reduce((acc, kudo) => {
          return acc + parseFloat(kudo.weight);
        }, 0);

        // get the weight by Identifier
        const weightByIdentifier = Object.values(pool).reduce((acc, kudo) => {
          const { identifier, weight } = kudo;
          if (acc[identifier]) {
            acc[identifier] += parseFloat(weight);
          } else {
            acc[identifier] = parseFloat(weight);
          }

          return acc;
        }, {});

        // convert weight back into string
        for (const key in weightByIdentifier) {
          weightByIdentifier[key] = weightByIdentifier[key]
            .toFixed(6)
            .toString();
        }

        // concat descriptions for each identifier
        const identifierDescriptions = Object.values(pool).reduce(
          (acc, kudo) => {
            const { identifier } = kudo;
            let { description } = kudo;
            description = description || "";
            if (description) {
              if (!acc[identifier]) {
                acc[identifier] = description; // first one wins
              }

              // limit chars
              const LIMIT_CHARS = 100;
              if (acc[identifier].length > LIMIT_CHARS) {
                acc[identifier] = acc[identifier].substring(0, LIMIT_CHARS);
              }
            }

            return acc;
          },
          {}
        );

        // these summary additions are weird, this needs a refactor/(re)think...
        // "maybe" summary shouldn't be used for send so we can get rid of this
        const identifierName = Object.values(pool).reduce((acc, kudo) => {
          const { identifier } = kudo;
          let { name } = kudo;
          name = name || "";
          if (name) {
            if (!acc[identifier]) {
              acc[identifier] = name; // first one wins
            }

            // limit chars
            const LIMIT_CHARS = 100;
            if (acc[identifier].length > LIMIT_CHARS) {
              acc[identifier] = acc[identifier].substring(0, LIMIT_CHARS);
            }
          }

          return acc;
        }, {});

        const identifierType = Object.values(pool).reduce((acc, kudo) => {
          const { identifier } = kudo;
          let { type: kudoType } = kudo;
          kudoType = kudoType || "";
          if (kudoType) {
            if (!acc[identifier]) {
              acc[identifier] = kudoType; // first one wins
            }

            // limit chars
            const LIMIT_CHARS = 100;
            if (acc[identifier].length > LIMIT_CHARS) {
              acc[identifier] = acc[identifier].substring(0, LIMIT_CHARS);
            }
          }

          return acc;
        }, {});

        const identifierPackage = Object.values(pool).reduce((acc, kudo) => {
          const { identifier } = kudo;
          let { packageName } = kudo;
          packageName = packageName || "";
          if (packageName) {
            if (!acc[identifier]) {
              acc[identifier] = packageName; // first one wins
            }

            // limit chars
            const LIMIT_CHARS = 100;
            if (acc[identifier].length > LIMIT_CHARS) {
              acc[identifier] = acc[identifier].substring(0, LIMIT_CHARS);
            }
          }

          return acc;
        }, {});

        // let slivers = 0;
        let amount = 100;
        stackResults.kudos = Object.entries(weightByIdentifier)
          .sort((a, b) => {
            return b[1] - a[1];
          })
          .map(([identifier, weight]) => {
            const description = identifierDescriptions[identifier];
            const name = identifierName[identifier];
            const type = identifierType[identifier];
            const packageName = identifierPackage[identifier];

            const share = parseFloat(weight) / parseFloat(totalWeight);
            if (share && share > 0 && amount) {
              const sliver = (share * parseFloat(amount || 0))
                .toFixed(6)
                .toString();
              // slivers += share * parseFloat(amount || 0);
              if (sliver !== "NaN") {
                return {
                  identifier,
                  weight,
                  sliver,
                  description,
                  name,
                  type,
                  packageName,
                };
              } else {
                return {
                  identifier,
                  weight,
                  description,
                  name,
                  type,
                  packageName,
                };
              }
            } else {
              return {
                identifier,
                weight,
                description,
                name,
                type,
                packageName,
              };
            }
          });

        for (const kudo of stackResults.kudos || []) {
          // kudo.identifier = await getSubjectHash(kudo.identifier);
          // kudos.push(kudo);

          // const addresses = [];
          // const weights = [];
          // const kudosMemos = [];

          const address = kudo.identifier; // .replace(/^did:kudos:/g, "");
          const weight = kudo.weight;
          if (parseFloat(weight) === 0) {
            continue; // skip already processed / zero weight
          }

          // TODO: the kudos memo gets written to the blockchain
          const kudosMemo = {
            // identity: the identity that got sent the kudos
            // TODO: get the poolId ... but we also want the package that the kudos came from, so may need to refactor
            description: kudo.description,
            name: kudo.name,
            packageName: kudo.packageName,
            type: kudo.type,
          };
          // truncate fields to no more than 200 chars, full memodata limited to < 1k
          // could probably do this more equitably, but this is a start
          for (const key in kudosMemo) {
            if (kudosMemo[key] && kudosMemo[key].length > 200) {
              kudosMemo[key] = kudosMemo[key].substring(0, 200);
            }
          }
          kudosMemos.push(kudosMemo);
          addresses.push(address);
          weights.push(weight);
        }

        if (shouldAddKudosCreators && !kudosCreatorsAdded) {
          // push our own id onto the list to pay ourselves via kudos

          // scale based on addresses.length, approaching the average weight. scale = 0 for only 1 address
          let scaleFactor = Math.log(addresses.length) / 3;
          if (scaleFactor > 1 || scaleFactor <= 0) {
            scaleFactor = 1;
          }

          if (context.debug) {
            log(`scaleFactor: ${scaleFactor}`);
          }

          let setlerWeight = (totalWeight / addresses.length) * scaleFactor;

          // add the setler team found in creatorPool
          for (let i = 0; i < creatorPool.length; i++) {
            let setlerCreator = creatorPool[i].id;
            let setlerCreatorWeight = creatorPool[i].weight;
            if (setlerCreatorWeight === 0) {
              continue;
            }
            if (!setlerCreatorWeight) {
              setlerCreatorWeight = 1;
            }
            if (setlerCreatorWeight > 1) {
              setlerCreatorWeight = 1;
            }

            let thisWeight = setlerCreatorWeight * setlerWeight;
            if (thisWeight > 1) {
              thisWeight = 1;
            }

            // add in kudos memo
            const kudosMemo = {
              ua: `setler/${context.version || "0.0.0"}`,
              type: "kudos/infra",
            };
            kudosMemos.push(kudosMemo);

            if (thisWeight > 0) {
              addresses.push(setlerCreator);
              weights.push(thisWeight.toFixed(6));
            }
          }

          kudosCreatorsAdded = true;
        }
      } else {
        let poolId = context.flags.poolId || context.input[2];
        if (!poolId) {
          let matching = context.flags.poolMatch || "";

          if (context.flags.poolName) {
            matching = context.flags.poolName;

            if (Array.isArray(matching)) {
              log(chalk.red(`Can only specify one pool name`));
              process.exit(1);
            }

            // add n: prefix if it's not already there
            if (!matching.startsWith("n:")) {
              matching = "n:" + matching;
            }
          } else if (context.flags.poolId) {
            matching = context.flags.poolId;

            if (Array.isArray(matching)) {
              log(chalk.red(`Can only specify one pool id`));
              process.exit(1);
            }

            // add i: prefix if it's not already there
            if (!matching.startsWith("i:")) {
              matching = "i:" + matching;
            }
          }

          let listResults = {};
          try {
            const listPromise = context.auth.listPools({
              network: kudosNetwork,
              matching,
            });
            listResults = await waitFor(listPromise, {
              text: `Fetching pools...`,
            });
          } catch (error) {
            log(chalk.red(`Error listing pools: ${error.message}`));
            process.exit(1);
          }

          const out = JSON.parse(listResults.response.out);
          // log(`${JSON.stringify(out, null, 2)}`);
          // out.pools is an array of {id,name}
          // use that to construct a prompt

          let choices = out.pools.map((pool) => {
            return {
              title: `${pool.name}`,
              description: `[${pool.id}]`,
              value: pool.id,
            };
          });
          // sort choices by title alphabetically
          choices = choices.sort((a, b) => {
            if (a.title < b.title) {
              return -1;
            }
            if (a.title > b.title) {
              return 1;
            }
            return 0;
          });

          if (choices.length === 0) {
            log(chalk.red(`No pools found`));
            process.exit(1);
          }

          // prompt for poolId
          const response = await prompts({
            type: "select",
            name: "poolId",
            message: "What poolId do you want to send to?",
            choices,
          });
          poolId = response.poolId;
        }

        if (!poolId) {
          log(chalk.red("PoolId is required"));
          process.exit(1);
        }

        // get the pool
        let getResults = {};
        try {
          const getPromise = context.auth.getPoolSummary({
            network: kudosNetwork,
            address: kudosAddress,
            poolId,
            frozenPoolId: context.flags.frozenPoolId || "",
            // amount,
          });
          getResults = await waitFor(getPromise, {
            text: `Retrieving pool...`,
          });
        } catch (error) {
          log(chalk.red(`Error getting pool: ${error.message}`));
          process.exit(1);
        }

        const out = JSON.parse(getResults.response.out);

        if (context.debug) {
          log(`${JSON.stringify(out, null, 2)}`);
        }

        const totalWeightServer = parseFloat(out.totalWeight); // TODO: compare server weight to local and error if different

        // loop through out.identities, setup weights
        for (let i = 0; i < out.identities.length; i++) {
          const identity = out.identities[i];
          const address = identity.identifier; // .replace(/^did:kudos:/g, "");
          const weight = identity.weight;
          if (parseFloat(weight) === 0) {
            continue; // skip already processed / zero weight
          }

          // TODO: the kudos memo gets written to the blockchain
          const kudosMemo = {
            // identity: the identity that got sent the kudos
            // TODO: get the poolId ... but we also want the package that the kudos came from, so may need to refactor
            description: identity.description,
            name: identity.name,
            packageName: identity.packageName,
            type: identity.type,
          };
          kudosMemos.push(kudosMemo);
          addresses.push(address);
          weights.push(weight);
        }

        if (shouldAddKudosCreators && !kudosCreatorsAdded) {
          // push our own id onto the list to pay ourselves via kudos
          // scale based on addresses.length, approaching the average weight. scale = 0 for only 1 address
          let scaleFactor = Math.log(addresses.length) / 3;
          if (scaleFactor > 1) {
            scaleFactor = 1;
          }
          if (context.debug) {
            log(`scaleFactor: ${scaleFactor}`);
          }

          let setlerWeight =
            (totalWeightServer / addresses.length) * scaleFactor;
          // add the setler team found in creatorPool
          for (let i = 0; i < creatorPool.length; i++) {
            let setlerCreator = creatorPool[i].id;
            let setlerCreatorWeight = creatorPool[i].weight;
            if (setlerCreatorWeight === 0) {
              continue;
            }
            if (!setlerCreatorWeight) {
              setlerCreatorWeight = 1;
            }
            if (setlerCreatorWeight > 1) {
              setlerCreatorWeight = 1;
            }

            let thisWeight = setlerCreatorWeight * setlerWeight;
            if (thisWeight > 1) {
              thisWeight = 1;
            }

            if (thisWeight > 0) {
              addresses.push(setlerCreator);
              weights.push(thisWeight.toFixed(6));
            }
          }

          kudosCreatorsAdded = true;
        }
      }

      if (context.debug) {
        log(`addresses: ${JSON.stringify(addresses)}`);
        log(`weights: ${JSON.stringify(weights)}`);
        log(`memos: ${JSON.stringify(kudosMemos)}`);
      }

      // estimate the fees
      const estPromise = context.coins.estimatedSendFee({
        network,
        sourceAddress, // estimate
        address: sourceAddress, // estimate
        amount: amountXrp,
        amountDrops: drops,
      });

      const estimatedFees = await waitFor(estPromise, {
        text: `Estimating fees`,
      });
      log(
        chalk.gray(
          `\tEstimated fees : \t${(estimatedFees * addresses.length).toFixed(
            6
          )} XRP`
        )
      );

      // convert the amount into usd
      const getExchange = getExchangeRate("XRP");
      const exchangeRate = await waitFor(getExchange, {
        text: "Fetching current exchange rate",
      });

      let amountUsd = parseFloat(amountXrp * exchangeRate).toFixed(2);
      if (amountUsd === "0.00") {
        amountUsd = parseFloat(amountXrp * exchangeRate).toFixed(5);
      }
      log(chalk.gray(`\tAmount in usd  : \t$${amountUsd}\n`));

      // confirm
      const confirm = await prompts([
        {
          type: "confirm",
          name: "ok",
          message: `Confirm amount to send: ${amountXrp} XRP?`,
          initial: false,
        },
      ]);
      if (!confirm.ok) {
        process.exit(1);
      }
      log("");

      // parse the addresses and weights
      let longestLength = 0;
      let weightedAddresses = addresses.map((address, i) => {
        if (address.length > longestLength) {
          longestLength = address.length;
        }

        // get corresponding weight
        const weight = weights[i] ? parseFloat(weights[i]) : 1;

        // add the memo
        const kudosMemo = kudosMemos[i];
        return {
          address,
          weight,
          kudosMemo,
        };
      });

      // calculate the amount each address gets from the total amountXrp
      let totalWeight = 0;
      let longestAmountLength = 0;
      let longestPercentLength = 0;
      let changedWeights = false;

      let totalFeeEstimate = (estimatedFees * weightedAddresses.length).toFixed(
        6
      ); // total fee estimate for all addresses
      let totalFeeEstimateDrops = xrpToDrops(totalFeeEstimate); // bignumber?

      let totalDropsBeforeFees = drops - totalFeeEstimateDrops;
      let totalXrpBeforeFees = totalDropsBeforeFees / 1000000;

      // log('drops', drops, 'minus fees', totalFeeEstimateDrops, 'equals', drops - totalFeeEstimateDrops);

      let skip = false;
      let confirmAll = false;
      let skipBootstrap = false;
      let confirmAllBootstrap = false;

      const calcWeights = () => {
        totalWeight = 0;
        totalWeight = weightedAddresses.reduce((total, address) => {
          return total + address.weight;
        }, 0);

        if (totalWeight === 0) {
          log(chalk.red(`send: total weight is 0`));
          log("Empty pool?");
          process.exit(1);
        }

        weightedAddresses = weightedAddresses.map((address) => {
          const amount = (totalXrpBeforeFees * address.weight) / totalWeight;
          const amountDrops = Math.round(
            (totalDropsBeforeFees * address.weight) / totalWeight
          ); // TODO: validate the drops usage is correct
          // see if we're below minimus threshold
          if (amountDrops < totalFeeEstimateDrops * 2) {
            // don't try to send less than 2x the fee estimate
            // if the amount is less than requirement, then we need to adjust the weight of this address
            // and recalculate the weights
            address.weight = 0;
            changedWeights = true;
            log(
              chalk.rgb(
                255,
                165,
                0
              )(
                `send: amount for ${address.address} is less than ${
                  (totalFeeEstimateDrops * 2) / 1000000
                } XRP. Will skip this address.`
              )
            );
          }

          // check if amount is less than 0
          if (amount < 0) {
            log(chalk.red(`send: amount is less than 0`));
            process.exit(1);
          }
          if (`${amount}`.length > longestAmountLength) {
            longestAmountLength = `${amount}`.length;
          }
          if (
            parseFloat((address.weight / totalWeight) * 100).toFixed(4).length >
            longestPercentLength
          ) {
            longestPercentLength = parseFloat(
              (address.weight / totalWeight) * 100
            ).toFixed(4).length;
          }
          return {
            ...address,
            // address: address.address,
            // weight: address.weight,
            amount: amount.toFixed(6),
            amountDrops: amountDrops,
          };
        });
      };
      calcWeights();
      if (changedWeights) {
        calcWeights();
      }
      const confirmWeights = async () => {
        // confirm the addresses and weights
        weightedAddresses.forEach((address) => {
          // see if this address is in creatorPool
          const isSetlerCreator = creatorPool.find(
            (creator) => creator.id === address.address
          );

          let amountUsd = parseFloat(address.amount * exchangeRate).toFixed(2);
          if (amountUsd === "0.00") {
            amountUsd = parseFloat(address.amount * exchangeRate).toFixed(5);
          }

          let output =
            chalk.blueBright(
              `${address.address} ${" ".repeat(
                longestLength - address.address.length
              )}  `
            ) +
            `${" ".repeat(
              longestPercentLength -
                parseFloat((address.weight / totalWeight) * 100).toFixed(4)
                  .length
            )}` +
            chalk.bold(
              `${parseFloat((address.weight / totalWeight) * 100).toFixed(
                4
              )}%  `
            ) +
            `${" ".repeat(
              longestAmountLength - address.amount.toString().length
            )}  ` +
            chalk.greenBright(`${address.amount} XRP`) +
            "  ~  " +
            chalk.cyanBright(`$${amountUsd}`) +
            (isSetlerCreator ? chalk.yellow("  (setler fee)") : "");

          if (isSetlerCreator) {
            // dim output
            log(chalk.dim(output));
          } else {
            log(output);
          }
        });

        // ask for confirmation
        log("");
        const confirm2 = await prompts([
          {
            type: "confirm",
            name: "ok",
            message: `Confirm addresses and weights?`,
            initial: false,
          },
        ]);
        if (!confirm2.ok) {
          process.exit(1);
        }
      };

      await confirmWeights();

      // confirm the account
      log("");
      log(
        `Source address: ` +
          chalk.yellow(`${sourceAddress}`) +
          "\n                " +
          stringToColorBlocks(sourceAddress, network) +
          "\n\nNetwork:        " +
          chalk.magentaBright(`${network}`)
      );
      log("");

      const confirm3 = await prompts([
        {
          type: "confirm",
          name: "ok",
          message: `Addresses and network Ok?`,
          initial: false,
        },
      ]);
      if (!confirm3.ok) {
        process.exit(1);
      }

      // see what type of addresses we have, and send accordingly
      // addresses can be an xrpl address, or a did subject (email:...) if they're not, we should error
      log("");

      // TODO: lookup all of these all at once and then ask for individual confirmation, should be faster?

      // loop through addresses and expand if needed
      for (let i = 0; i < weightedAddresses.length; i++) {
        const address = weightedAddresses[i];
        const types = detectStringTypes(address.address); // is this a did, xrpl address, etc
        if (context.flags.verbose) {
          log(`Detected types: ${JSON.stringify({ types, address })}`);
        }
        if (types.subject) {
          // expand this address
          const subject = address.address;

          let directPaymentVia, escrowMethod;
          // this throws so we have a red x
          const payViaPromise = getSubjectPayVia({
            subject,
            network,
            debug: context.debug,
          });

          const response = await waitFor(payViaPromise, {
            text: `Looking up address for ` + chalk.blue(`${subject}`),
          });

          directPaymentVia = response.payVia;
          escrowMethod = response.escrowMethod;

          // loop through expanded see if any are xrpl addresses with our network
          if (context.flags.verbose) {
            log(
              chalk.gray(
                `Expanded ${subject} to ${JSON.stringify({
                  directPaymentVia,
                  escrowMethod,
                })}`
              )
            );
          }

          if (!directPaymentVia && escrowMethod && context.flags.escrow) {
            // ask if we should create an escrow payment
            if (!confirmAll && !skip) {
              log("");
              log(
                `No xrpl address found for subject ` +
                  chalk.blue(`${subject}`) +
                  `.`
              );
              log(
                `Escrow payment available via: ` +
                  chalk.yellow(`${escrowMethod.address} `) +
                  "\n                              " +
                  stringToColorBlocks(escrowMethod.address, network)
              );
              if (escrowMethod.time) {
                log("");
                log(
                  chalk.gray(`=> Escrow payment expires: `) +
                    chalk.cyan(
                      `${new Date(
                        Date.now() + escrowMethod.time * 1000
                      ).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}`
                    )
                );
                if (escrowMethod.onExpiration === "snowball") {
                  log("");
                  log(
                    chalk.gray(
                      "=> Unclaimed funds will be redistributed via the"
                    ) +
                      " snowball " +
                      chalk.gray("method.") +
                      "\n   " +
                      chalk.red(
                        "! There is no option to receive your funds back !"
                      ) +
                      "\n   " +
                      chalk.gray(
                        "Unclaimed funds are used to support other projects."
                      )
                  );
                } else {
                  // the default
                  log("");
                  log(
                    chalk.gray(
                      "=> After this time, the escrow can be cancelled."
                    )
                  );
                }

                if (escrowMethod.terms) {
                  log("");
                  log(
                    chalk.gray(
                      "=> Sending via escrow implies agreeing to the terms:\n   "
                    ) + chalk.cyan(escrowMethod.terms)
                  );
                }

                if (escrowMethod.fee) {
                  log("");
                  log(
                    chalk.gray("=> Escrow fees:\n   ") +
                      chalk.cyan(escrowMethod.fee.toFixed(4) + " %")
                  );
                }
              }
              log("");
              log("");

              // create escrow payment? y,n,none,all
              const confirm4 = await prompts([
                {
                  type: "select",
                  name: "escrow",
                  message: "Create escrow payment? ",
                  choices: [
                    { title: "Yes", value: "y" },
                    { title: "No", value: "n" },
                    { title: "Yes to all", value: "all" },
                    { title: "Skip escrow", value: "skip" },
                  ],
                  initial: 0,
                },
                // {
                //   type: "confirm",
                //   name: "ok",
                //   message: "Create escrow payment? ",
                //   initial: false,
                // },
              ]);
              if (confirm4.escrow === "n") {
                log(
                  chalk.red(
                    `send: Could not expand subject ${subject}. Remove from list and try again.`
                  )
                );
                process.exit(1);
              }
              if (confirm4.escrow === "skip") {
                // skip any escrow
                skip = true;
                confirmAll = false;
              }
              if (confirm4.escrow === "all") {
                // confirm for all
                confirmAll = true;
                skip = false;
              }
            }

            if (!skip) {
              // mark this address as an escrow
              weightedAddresses[i].escrow = {
                identifier: subject,
                ...escrowMethod,
              };
              weightedAddresses[i].expandedAddress = escrowMethod.address;
              if (context.flags.verbose) {
                log(chalk.magenta(JSON.stringify(escrowMethod, null, 2)));
              }
            } else {
              weightedAddresses[i].weight = 0; // remove from the list
              changedWeights = true;
            }
          } else if (!directPaymentVia) {
            if (!confirmAll && !skip) {
              log("");
              log(
                `No direct payment address found for ` +
                  chalk.blue(`${subject}`) +
                  `.`
              );

              weightedAddresses[i].shouldThank = true; // eligible for thank you
              weightedAddresses[i].shouldBootstrap = true; // eligible for bootstrap funding
              weightedAddresses[i].originalWeight = weightedAddresses[i].weight;
              weightedAddresses[i].weight = 0; // remove from the list
              changedWeights = true;
            } else if (skip) {
              weightedAddresses[i].weight = 0; // remove from the list
              changedWeights = true;
            } else {
              log(
                chalk.red(
                  `send: [abc] Could not expand ${subject}. Remove from list and try again.`
                )
              );
              process.exit(1);
            }
          } else {
            weightedAddresses[i].expandedAddress = directPaymentVia;

            // show user the expanded address
            log("");
            log(
              chalk.blue(`Expanded ${subject} to `) +
                chalk.yellow(`${directPaymentVia} `) +
                "\n" +
                " ".repeat(`Expanded ${subject} to `.length) +
                stringToColorBlocks(directPaymentVia, network)
            );

            log("");
          }
        } else if (types.accountAddress) {
          weightedAddresses[i].expandedAddress = address.address;
        } else {
          log(chalk.red(`\nsend: unknown address type ${address.address}`));
          if (context.flags.failOnErrors) {
            process.exit(1);
          }
          // remove this
          weightedAddresses[i].weight = 0;
          changedWeights = true;
          continue;
        }

        // skip this if the destination is equal to the source
        if (weightedAddresses[i].expandedAddress === sourceAddress) {
          changedWeights = true;
          log(
            chalk.red(
              `send: Removing entry for address ${sourceAddress}. Won't send to self.`
            )
          );
          weightedAddresses[i].weight = 0;
          continue;
        }
      }

      // we should recalculate the weights, as we may have removed some addresses
      if (changedWeights) {
        log("");
        calcWeights();
        await confirmWeights();
      }

      // ask if we should send a thank you for those that don't have direct payment set
      // const thankYou = await prompts([
      //   {
      //     type: "confirm",
      //     name: "value",
      //     message: `Create thank you scores for ids without payment? (Costs 1 Drop/id. Used by leaderboard and notifications.)`,
      //     initial: true,
      //   },
      // ]);
      const thankYou = { value: flags.skipThankYou ? false : true };

      // see how much we have in this account, to verify it's enough to cover the transaction?
      const getAcctPromise = context.coins.getAccountInfo({
        network,
        sourceAddress,
      });
      const accountInfo = await waitFor(getAcctPromise, {
        text:
          `Getting account balance for: ` +
          chalk.yellow(
            `${sourceAddress}\n` +
              "                               " +
              stringToColorBlocks(sourceAddress, network)
          ),
      });
      const balance = accountInfo?.xrpDrops;
      if (!balance) {
        log(chalk.red(`send: Could not get balance for ${sourceAddress}`), {
          balance,
          accountInfo,
        });
        process.exit(1);
      }
      const balanceXrp = parseFloat(balance) / 1000000;
      if (balanceXrp < amountXrp) {
        log(
          chalk.red(
            `send: Not enough funds in ${sourceAddress} to send ${amountXrp} XRP`
          )
        );
        process.exit(1);
      }
      log("");
      log(
        `Balance after sending ` +
          chalk.green(`${amountXrp} XRP`) +
          ` will be ` +
          chalk.green(`${balanceXrp - amountXrp} XRP`)
      );
      log("");

      const { width } = windowSize.get();
      log(" " + "─".repeat(width - 2));
      // we should do the direct transfers first, then the escrow transfers
      // log(JSON.stringify(weightedAddresses, null, 2));

      const directCount = weightedAddresses.filter(
        (a) => a.weight > 0 && !a.escrow
      ).length;
      const escrowCount = weightedAddresses.filter(
        (a) => a.weight > 0 && a.escrow
      ).length;
      const skipCount = weightedAddresses.filter((a) => a.weight === 0).length;
      const thanksCount = thankYou.value
        ? weightedAddresses.filter((a) => a.shouldThank && a.weight === 0)
            .length
        : 0;

      log(`This transaction will send:`);
      log("");
      log(`  ${chalk.green(amountXrp)} XRP`);
      log("");
      log(
        `To ${chalk.yellow(
          weightedAddresses.length - (skipCount || 0)
        )} addresses:`
      );
      log(chalk.green(` direct : ${directCount}`));
      log(chalk.magenta(` escrow : ${escrowCount}`));
      if (thankYou.value) {
        log(chalk.yellow(` thanks : ${thanksCount}`));
      } else {
        log(chalk.yellow(` skipped: ${skipCount}`));
      }
      log(" " + "─".repeat(width - 2));
      log("");
      for (let i = 0; i < weightedAddresses.length; i++) {
        let currentAddress = weightedAddresses[i];
        if (currentAddress.weight === 0) {
          continue;
        }
        if (currentAddress.escrow) {
          log(
            `  ${currentAddress.amount} ${chalk.magenta(
              "escrow to "
            )} [${chalk.yellow(currentAddress.address)}]`
          );
        } else {
          log(
            `  ${currentAddress.amount} ${chalk.green(
              "direct to     "
            )} ${chalk.cyan(currentAddress.expandedAddress)} [${chalk.yellow(
              currentAddress.address
            )}]`
          );
          log(
            " ".repeat(3 + `${currentAddress.amount} direct to     `.length) +
              stringToColorBlocks(currentAddress.expandedAddress, network)
          );
        }
      }
      log("");

      // last confirmation
      if (!context.flags.yes) {
        const confirm2 = await prompts([
          {
            type: "text",
            name: "doit",
            message:
              `Type: ` + chalk.red("send it") + ` to initiate transfer: `,
            initial: false,
          },
        ]);
        if (confirm2.doit !== "send it") {
          log(chalk.red(`send: aborting`));
          process.exit(1);
        }
      }

      // setup bootstrap address/key defaults
      const bootstrapAddressData = await lookupMetadata({
        subject: "email:setler@loremlabs.com", // TODO: bootstrap
        network: network.replace(":", "-"),
        domain: "ident.cash",
        node: "",
      });
      let bootStrapAddress = bootstrapAddressData["$apex"];

      // and the public key
      const bootstrapKeyData = await lookupMetadata({
        subject: "email:setler@loremlabs.com", // TODO: bootstrap
        network: network.replace(":", "-"),
        domain: "ident.domains",
        node: "pubkey",
      });
      let bootstrapPublicKey = bootstrapKeyData?.pubkey;
      let bootstrapAddress =
        bootStrapAddress || "rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3";
      bootstrapPublicKey =
        bootstrapPublicKey ||
        "02FF4B735099A5CDAB387201E7B67092132D38B07E1F3C04A8FE1FA1C223ECD913";

      let receipts = [];
      const setleId = shortId();

      log("");
      // send direct payments
      let directSent = 0;
      for (let i = 0; i < weightedAddresses.length; i++) {
        let currentAddress = weightedAddresses[i];
        if (currentAddress.weight === 0) {
          continue;
        }
        if (currentAddress.escrow) {
          continue;
        }
        // log(chalk.yellow(JSON.stringify(currentAddress, null, 2)));
        // log(
        //   `Sending ` +
        //     chalk.green(`${currentAddress.amount}`) +
        //     ` to ` +
        //     chalk.blue(`${currentAddress.expandedAddress}`)
        // );

        // setup memos:
        const Memos = [];

        const subject = currentAddress.address;

        // we attempt to lookup the public key for this address
        // if it exists, we encrypt extra information in the memo
        const pubKeyData = await lookupMetadata({
          subject,
          network,
          domain: "ident.domains",
          node: "pubkey",
        });
        let currentAddressPublicKey = pubKeyData?.pubkey;
        if (!currentAddressPublicKey && !context.flags.skipMemo) {
          // default to the bootstrap key to be able to show in ui
          // NB: makes this data available to the bootstrap account
          currentAddressPublicKey = bootstrapPublicKey;
        }

        if (context.debug) {
          log(
            chalk.gray(
              `send: pubkey for ${subject} on ${network}: ${currentAddressPublicKey}`
            )
          );
        }

        // see if we have a public key, if so, create an encrypted memo
        let memoValue = JSON.stringify({});
        let memoMime = "application/json"; // application/octet-stream

        if (
          currentAddressPublicKey &&
          currentAddress.kudosMemo &&
          !context.flags.skipMemo
        ) {
          // create an encrypted memo
          const encryptPromise = context.coins.encrypt({
            publicKey: currentAddressPublicKey,
            message: {
              ...currentAddress.kudosMemo,
              subject: currentAddress.address.slice(0, 200),
            },
          });
          const { encrypted } = await encryptPromise;

          memoValue = JSON.stringify(encrypted); // adds quotes
          memoMime = "kudos/enc";
        }

        // console.log('debug', {memoValue, memoMime, currentAddressPublicKey, currentAddress, network, sourceAddress, address: currentAddress.expandedAddress, amount: currentAddress.amount, amountDrops: currentAddress.amountDrops});

        // Enter memo data to insert into a transaction
        const MemoData = convertStringToHex(memoValue).toUpperCase();
        const MemoType = convertStringToHex("kudos").toUpperCase();
        const MemoFormat = convertStringToHex(memoMime).toUpperCase();
        Memos.push({
          Memo: {
            MemoType,
            MemoFormat,
            MemoData,
          },
        });

        const dpPromise = context.coins.send({
          network,
          sourceAddress,
          address: currentAddress.expandedAddress,
          amount: currentAddress.amount,
          amountDrops: currentAddress.amountDrops,
          tag: currentAddress.tag,
          memos: Memos,
        });

        const directPayment = await waitFor(dpPromise, {
          text:
            `Sending ` +
            chalk.green(`${currentAddress.amount}`) +
            " XRP to " +
            chalk.blue(`${currentAddress.expandedAddress}`) +
            "\n" +
            " ".repeat(
              `  Sending ${currentAddress.amount + ""} XRP to `.length
            ) +
            stringToColorBlocks(currentAddress.expandedAddress, network),
        });
        // console.log(JSON.stringify({directPayment, currentAddress},null,2));

        // see if this account doesn't exist.
        if (
          directPayment.result?.meta?.TransactionResult ===
          "tecNO_DST_INSUF_XRP"
        ) {
          // account doesn't exist vs tecNO_DST?
          //         if so, we should send a thanks transaction for it
          // and set aside the money for the community pool
          // log(chalk.red(`send: account doesn't exist`));
          if (!flags.skipBootstrap) {
            // console.log("sending thank you to", JSON.stringify(currentAddress));

            const bootstrapMessage = {
              ...currentAddress.kudosMemo,
              subject: currentAddress.address.slice(0, 200),
            };

            // create an encrypted memo
            const encryptPromise = context.coins.encrypt({
              publicKey: bootstrapPublicKey,
              message: bootstrapMessage,
            });
            const { encrypted } = await encryptPromise;

            // setup memos:
            const Memos = [];

            // Enter memo data to insert into a transaction
            const MemoData = convertStringToHex(
              JSON.stringify(encrypted)
            ).toUpperCase();
            const MemoType = convertStringToHex("bootstrap").toUpperCase();
            // MemoFormat values: # MemoFormat values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
            const MemoFormat =
              convertStringToHex("kudos/bootstrap").toUpperCase();
            Memos.push({
              Memo: {
                MemoType,
                MemoFormat,
                MemoData,
              },
            });

            // calculate the payment amount. It should be the currentAddress.amount - 2 * directPayment.result.Fee
            const bootstrapAmount = (
              parseFloat(currentAddress.amount) -
              2 * (parseFloat(directPayment.result.Fee) / 1000000)
            ).toFixed(6);
            if (bootstrapAmount.startsWith("-")) {
              // our fee would make this a loss, we'll skip
              continue;
            }

            // ask if the user wants us to do this
            if (!confirmAllBootstrap && !skipBootstrap) {
              log("");
              log(
                `No xrpl address found for subject ` +
                  chalk.blue(`${currentAddress.address}`) +
                  `.`
              );
              log(
                `You can support the development of Kudos by sending the payment to our Bootstrap fund via: ` +
                  chalk.yellow(`${bootstrapAddress} `) +
                  "\n                              " +
                  stringToColorBlocks(bootstrapAddress, network)
              );
              log("");

              // create bootstrap payment? y,n,none,all
              const confirm4 = await prompts([
                {
                  type: "select",
                  name: "bootstrap",
                  message: "Create bootstrap payment? ",
                  choices: [
                    { title: "Yes to all", value: "all" },
                    { title: "Yes", value: "y" },
                    { title: "No", value: "n" },
                    { title: "Skip bootstrap", value: "skip" },
                  ],
                  initial: 0,
                },
              ]);
              if (confirm4.bootstrap === "n") {
                continue;
              }
              if (confirm4.bootstrap === "skip") {
                // skip any escrow
                skipBootstrap = true;
                confirmAllBootstrap = false;
                continue;
              }
              if (confirm4.bootstrap === "all") {
                // confirm for all
                confirmAllBootstrap = true;
                skipBootstrap = false;
              }
            }

            const txPromise = context.coins.send({
              network,
              sourceAddress,
              address: bootstrapAddress,
              amount: bootstrapAmount,
              amountDrops: xrpToDrops(bootstrapAmount),
              memos: Memos,
            });

            const txPayment = await waitFor(txPromise, {
              text: `Sending bootstrap payment in lieu of direct payment to ${chalk.cyan(
                bootstrapAddress
              )}`,
            });

            if (!txPayment) {
              log(
                chalk.red(
                  `send: could not send this direct payment. Check transaction history before trying again.`
                )
              );
              process.exit(1);
            }
            log(
              chalk.bold(
                `Transaction: ` + chalk.green(`${txPayment.result.hash}`)
              )
            );
          }
        }

        if (!directPayment) {
          log(
            chalk.red(
              `send: could not send this direct payment. Check transaction history before trying again.`
            )
          );
          process.exit(1);
        }
        log(
          chalk.bold(
            `Transaction: ` + chalk.green(`${directPayment.result.hash}`)
          )
        );

        // create a kudosReceipt
        let ts = new Date().toISOString();
        // remove ms
        ts = ts.replace(/\.\d{3}Z$/, "Z");
        let weight = parseFloat(weightedAddresses[i].weight) * -1; // negate
        let kudosReceipt = {
          identifier: currentAddress.address,
          weight: weight.toFixed(6),
          id: shortId(),
          traceId: setleId,
          ts,
          receipt: {
            type: "direct",
            amount: currentAddress.amount,
            address: currentAddress.expandedAddress,
            tx: directPayment.result.hash,
          },
        };
        receipts.push(kudosReceipt);
        directSent++;
      }

      if (directSent) {
        log("");
        log(
          chalk.bold(
            chalk.green(`✔`) + ` Ok, direct payments sent successfully.`
          )
        );
        log("");
      }

      // log(chalk.bold(`send: Sending escrow payments`));

      // send escrow payments
      for (let i = 0; i < weightedAddresses.length; i++) {
        let currentAddress = weightedAddresses[i];
        if (currentAddress.weight === 0) {
          continue;
        }
        if (!currentAddress.escrow) {
          continue;
        }
        // log(JSON.stringify(currentAddress.escrow));
        // log(
        //   `Sending ` +
        //     chalk.green(`${currentAddress.amount}`) +
        //     ` to ` +
        //     chalk.blue(`${currentAddress.expandedAddress} as escrow`)
        // );

        const epPromise = context.coins.sendEscrow({
          network,
          sourceAddress,
          address: currentAddress.expandedAddress,
          amount: currentAddress.amount,
          amountDrops: currentAddress.amountDrops,
          escrow: currentAddress.escrow,
        });
        const { result, fulfillmentTicket, escrowTx, condition } =
          await waitFor(epPromise, {
            text:
              `Creating Escrow of ` +
              chalk.green(`${currentAddress.amount}`) +
              " via " +
              chalk.blue(`${currentAddress.expandedAddress}`),
          });

        if (!result && !fulfillmentTicket) {
          log(chalk.red(`send: could not send escrow payment`));
          process.exit(1);
        }

        const toNotify = {
          network,
          sourceAddress,
          viaAddress: currentAddress.expandedAddress,
          amount: currentAddress.amount,
          amountDrops: currentAddress.amountDrops,
          escrow: currentAddress.escrow,
          fulfillmentTicket,
          condition,
          sequenceNumber: result.result.Sequence,
          escrowId: result.result.hash,
          cancelAfter: escrowTx.CancelAfter,
          identifier: currentAddress.escrow.identifier,
        };
        if (context.flags.verbose) {
          log(toNotify);
        }
        // TODO: store the fulfillment ticket locally?

        // show escrowId to user
        log(
          chalk.bold(
            `Escrow Transaction: ` + chalk.green(`${toNotify.escrowId}`)
          )
        );

        // send the fulfillment to the escrow agent
        const sendToEscrowAgent = async () => {
          const nePromise = notifyEscrow(toNotify);
          try {
            await waitFor(nePromise, {
              text: `Notifying Escrow Agent for ${chalk.cyan(
                currentAddress.escrow.identifier
              )}`,
            });
          } catch (e) {
            log("");
            log(" " + "─".repeat(width - 2));
            log(chalk.red(`send: could not notify escrow agent: ${e.message}`));
            log("");

            // see if we should try again
            const retry = await prompts([
              {
                type: "confirm",
                name: "value",
                message: `Do you want to try to notify again? (No new transaction is created.)`,
                initial: true,
              },
            ]);
            if (retry.value) {
              log("");
              return await sendToEscrowAgent();
            } else {
              log({ toNotify });
              process.exit(1);
            }
          }
        };

        await sendToEscrowAgent();

        // create a kudosReceipt
        let ts = new Date().toISOString();
        // remove ms
        ts = ts.replace(/\.\d{3}Z$/, "Z");
        let weight = parseFloat(currentAddress.weight) * -1; // negate
        let kudosReceipt = {
          identifier: currentAddress.escrow.identifier,
          weight: weight.toFixed(6),
          id: shortId(),
          traceId: setleId,
          ts,
          receipt: {
            type: "escrow",
            amount: toNotify.amount,
            viaAddress: toNotify.viaAddress,
            tx: toNotify.escrowId,
          },
        };
        receipts.push(kudosReceipt);
      }

      // output as ndjson
      if (context.flags.showReceipts) {
        for (let i = 0; i < receipts.length; i++) {
          let receipt = receipts[i];
          log(JSON.stringify(receipt));
        }
      }

      // TODO: refactor, this is now part of the failed transfer
      // if (false && thankYou.value) {
      //   // send a thank you to the global leaderboard

      //   // loop through weights
      //   for (let i = 0; i < weightedAddresses.length; i++) {
      //     // only send to those that don't have direct payment set
      //     let currentAddress = weightedAddresses[i];
      //     if (currentAddress.shouldThank) {
      //       // console.log("sending thank you to", JSON.stringify(currentAddress));

      //       const IDENT_NOTIFY_ADDRESS = "rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3"; // TODO: lookup dynamically, compare with hard coded and warn if different
      //       const IDENT_PUBLIC_KEY =
      //         "02FF4B735099A5CDAB387201E7B67092132D38B07E1F3C04A8FE1FA1C223ECD913";

      //       const thanksMessage = {
      //         ...currentAddress.kudosMemo,
      //         id: currentAddress.address,
      //         score: `${
      //           currentAddress.weight || currentAddress.originalWeight
      //         }`, // TODO: could use for score, but not working?
      //       };

      //       // create an encrypted memo
      //       const encryptPromise = context.coins.encrypt({
      //         publicKey: IDENT_PUBLIC_KEY,
      //         message: thanksMessage,
      //       });
      //       const { encrypted } = await encryptPromise;

      //       // setup memos:
      //       const Memos = [];

      //       // Enter memo data to insert into a transaction
      //       const MemoData = convertStringToHex(encrypted).toUpperCase();
      //       const MemoType = convertStringToHex("thanks").toUpperCase();
      //       // MemoFormat values: # MemoFormat values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
      //       const MemoFormat = convertStringToHex("kudos/thanks").toUpperCase();
      //       Memos.push({
      //         Memo: {
      //           MemoType,
      //           MemoFormat,
      //           MemoData,
      //         },
      //       });

      //       const txPromise = context.coins.send({
      //         network,
      //         sourceAddress,
      //         address: IDENT_NOTIFY_ADDRESS,
      //         amount: "0.000001",
      //         amountDrops: xrpToDrops("0.000001"),
      //         memos: Memos,
      //       });

      //       const txPayment = await waitFor(txPromise, {
      //         text: `Sending thanks to ` + JSON.stringify(currentAddress),
      //       });

      //       if (!txPayment) {
      //         log(
      //           chalk.red(
      //             `send: could not send this direct payment. Check transaction history before trying again.`
      //           )
      //         );
      //         process.exit(1);
      //       }
      //       log(
      //         chalk.bold(
      //           `Transaction: ` + chalk.green(`${txPayment.result.hash}`)
      //         )
      //       );
      //     }
      //   }
      // }

      context.coins.disconnect();
      break;
    }
    default:
      if (
        !context.input[1] ||
        context.flags.help ||
        context.input[1] === "help"
      ) {
        // give help with available subcommands and flags
        help();
      }

      log(chalk.red(`Unknown command: ${context.input[1]}`));
      process.exit(1);
  }
};

export { exec };
