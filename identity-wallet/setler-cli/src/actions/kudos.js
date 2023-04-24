import * as child_process from "child_process";

import YAML from "yaml";
import _glob from "glob";
import chalk from "chalk";
import { detectStringTypes } from "../lib/detect.js";
import { expandDid } from "../lib/did.js";
import fs from "fs";
import { gatekeep } from "../lib/wallet/gatekeep.js";
import { getExchangeRate } from "../lib/wallet/getExchangeRate.js";
import { gzipSync } from "node:zlib";
import { notifyEscrow } from "../lib/escrow.js";
import parseAuthor from "parse-author";
import { promisify } from "util";
import prompts from "prompts";
import { shortId } from "../lib/short-id.js";
import { stringToColorBlocks } from "../lib/colorize.js";
import { waitFor } from "../lib/wait.js";
import windowSize from "window-size";
import { xrpToDrops } from "xrpl";

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
  log("  identify [path]");
  log("");
  log("Options:");
  log(
    "  --profile <profile> - default: 0, 1, 2, ... Same mnemonic, different keys"
  );
  log(
    "  --scope <scope> - default: 0, 1, 2, ... Different mnemonic, different keys"
  );
  log("  --passPhrase <passPhrase> - default: ''");
  log("  --yes - default: false");
  log("");
  log("Examples:");
  log("  setler kudos keys --json --profile 0");
  log("  setler kudos address");
  log("  setler kudos create");
  log("  setler kudos identify .");
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

        // make sure identifier starts with our did:kudos prefix, making sure not to double prefix
        if (!identifier.startsWith("did:kudos:")) {
          identifier = `did:kudos:${identifier}`;
        }

        let ts = new Date().toISOString();
        // remove ms
        ts = ts.replace(/\.\d{3}Z$/, "Z");

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

              if (pkg.name && !weights[pkg.name]) {
                weights[pkg.name] = weight;
                if (flags.debug) {
                  debugLog(chalk.blueBright("weight", weights[pkg.name]));
                }
                if (pkg.dependencies) {
                  const splitWeight =
                    weight / (Object.keys(pkg?.dependencies).length + 1);
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
                  const splitWeight =
                    weight / (Object.keys(pkg?.devDependencies).length + 1);
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

      // TODO: do this in chunks
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
      await gatekeep(context, true);

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
            name: "didType",
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
        switch (response.didType) {
          case "email":
            identifier = `did:kudos:email:${response.email
              .trim()
              .toLowerCase()}`;
            break;
          case "twitter": {
            let twitter = response.twitter.trim().toLowerCase();
            if (twitter.startsWith("@")) {
              twitter = twitter.slice(1);
            }

            identifier = `did:kudos:twitter:${twitter}`;
            break;
          }
          case "github": {
            let github = response.github.trim().toLowerCase();
            if (github.startsWith("@")) {
              github = github.slice(1);
            }

            identifier = `did:kudos:github:${github}`;
            break;
          }
          case "did": {
            identifier = response.did.trim();
            break;
          }
          default:
            throw new Error(`Unknown identifier type: ${response.didType}`);
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

        log(`SETLER_KEYS_${context.profile}="${kudosKeysExportBase64}"`);
      }
      break;
    }
    case "send": {
      await gatekeep(context);

      const network = context.flags.network || "xrpl:testnet";
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

      let poolId = context.flags.poolId || context.input[2];
      if (!poolId) {
        // prompt for poolId
        const response = await prompts({
          type: "text",
          name: "poolId",
          message: "What poolId do you want to send to?",
        });
        poolId = response.poolId;
      }

      if (!poolId) {
        log(chalk.red("PoolId is required"));
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

      // get the pool
      let getResults = {};
      try {
        const getPromise = context.auth.getPoolSummary({
          network: kudosNetwork,
          address: kudosAddress,
          poolId,
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

      const addresses = [];
      const weights = [];
      // const totalWeightServer = out.totalWeight; // TODO: compare server weight to local and error if different

      // loop through out.identities, setup weights
      for (let i = 0; i < out.identities.length; i++) {
        const identity = out.identities[i];
        const address = identity.identifier;
        const weight = identity.weight;
        if (parseFloat(weight) === 0) {
          continue; // skip already processed / zero weight
        }
        addresses.push(address);
        weights.push(weight);
      }

      if (context.debug) {
        log(`addresses: ${JSON.stringify(addresses)}`);
        log(`weights: ${JSON.stringify(weights)}`);
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
          `\tEstimated fees : \t${estimatedFees * addresses.length} XRP`
        )
      );

      // convert the amount into usd
      const getExchange = getExchangeRate("XRP");
      const exchangeRate = await waitFor(getExchange, {
        text: "Fetching current exchange rate",
      });

      const amountUsd = parseFloat(amountXrp * exchangeRate).toFixed(2);
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
        return {
          address,
          weight,
        };
      });

      // calculate the amount each address gets from the total amountXrp
      let totalWeight = 0;
      let longestAmountLength = 0;
      let longestPercentLength = 0;
      let changedWeights = false;

      let totalFeeEstimate = estimatedFees * weightedAddresses.length; // total fee estimate for all addresses
      let totalFeeEstimateDrops = xrpToDrops(totalFeeEstimate); // bignumber?

      let totalDropsBeforeFees = drops - totalFeeEstimateDrops;
      let totalXrpBeforeFees = totalDropsBeforeFees / 1000000;

      // log('drops', drops, 'minus fees', totalFeeEstimateDrops, 'equals', drops - totalFeeEstimateDrops);

      let skip = false;
      let confirmAll = false;

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
          if (amountDrops < 750) {
            // don't try to send less than 0.0000075 XRP
            // if the amount is less than 0.0000075 XRP, then we need to adjust the weight of this address
            // and recalculate the weights
            address.weight = 0;
            changedWeights = true;
            log(
              chalk.rgb(
                255,
                165,
                0
              )(
                `send: amount for ${address.address} is less than 0.0000075 XRP. Will skip this address.`
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
          log(
            chalk.blue(
              `${address.address}${" ".repeat(
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
              chalk.cyanBright(
                `$${parseFloat(address.amount * exchangeRate).toFixed(2)}`
              )
          );
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
      // addresses can be an xrpl address, or a did (did:kudos:...) if they're not, we should error
      log("");

      let identResolver =
        context.flags.identResolver || context.config.identity?.identResolver;
      // TODO: fix this hack
      identResolver = identResolver.trim();
      if (identResolver.endsWith("/")) {
        identResolver = identResolver.slice(0, -1);
      }

      // loop through addresses and expand if needed
      for (let i = 0; i < weightedAddresses.length; i++) {
        const address = weightedAddresses[i];
        const types = detectStringTypes(address.address); // is this a did, xrpl address, etc
        if (context.flags.verbose) {
          log(`Detected types ${JSON.stringify(types)}`);
        }
        if (types.did) {
          // expand this address
          const did = address.address;

          let directPaymentVia, escrowMethod;
          try {
            // this throws so we have a red x
            const expandPromise = expandDid({
              did,
              identResolver,
              network,
              debug: context.debug,
            });

            const response = await waitFor(expandPromise, {
              text: `Looking up address for ` + chalk.blue(`${did}`),
            });

            directPaymentVia = response.directPaymentVia;
            escrowMethod = response.escrowMethod;
          } catch (e) {
            if (e.message !== "Escrow only") {
              log(chalk.red(`Error expanding did ${did}: ${e.message}`));
              process.exit(1);
            }
            // no payment methods found
            directPaymentVia = e.extra.directPaymentVia;
            escrowMethod = e.extra.escrowMethod;
          }

          // loop through expanded see if any are xrpl addresses with our network
          if (context.flags.verbose) {
            log(
              chalk.gray(
                `Expanded ${did} to ${JSON.stringify({
                  directPaymentVia,
                  escrowMethod,
                })}`
              )
            );
          }

          if (!directPaymentVia && escrowMethod) {
            // ask if we should create an escrow payment
            if (!confirmAll && !skip) {
              log("");
              log(
                `No xrpl address found for did ` + chalk.blue(`${did}`) + `.`
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
                    `send: Could not expand did ${did}. Remove from list and try again.`
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
                identifier: did,
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
            log(
              chalk.red(
                `send: Could not expand did ${did}. Remove from list and try again.`
              )
            );
            process.exit(1);
          } else {
            weightedAddresses[i].expandedAddress = directPaymentVia;

            // show user the expanded address
            log("");
            log(
              chalk.blue(`Expanded ${did} to `) +
                chalk.yellow(`${directPaymentVia} `) +
                "\n" +
                " ".repeat(`Expanded ${did} to `.length) +
                stringToColorBlocks(directPaymentVia, network)
            );

            log("");
          }
        } else if (types.accountAddress) {
          weightedAddresses[i].expandedAddress = address.address;
        } else {
          log(chalk.red(`\nsend: unknown address type ${address.address}`));
          process.exit(1);
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

      log(`This transaction will send:`);
      log("");
      log(`  ${chalk.green(amountXrp)} XRP`);
      log("");
      log(`To ${chalk.yellow(weightedAddresses.length)} addresses:`);
      log(chalk.green(` direct : ${directCount}`));
      log(chalk.magenta(` escrow : ${escrowCount}`));
      log(chalk.yellow(` skipped: ${skipCount}`));
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
              "direct to "
            )} [${chalk.yellow(currentAddress.address)}] ${chalk.cyan(
              currentAddress.expandedAddress
            )}`
          );
          log(
            " ".repeat(
              4 +
                `${currentAddress.amount} [${chalk.yellow(
                  currentAddress.address
                )}]`.length
            ) + stringToColorBlocks(currentAddress.expandedAddress, network)
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
        const dpPromise = context.coins.send({
          network,
          sourceAddress,
          address: currentAddress.expandedAddress,
          amount: currentAddress.amount,
          amountDrops: currentAddress.amountDrops,
          tag: currentAddress.tag,
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

      // checkpoint: send receipts
      if (receipts.length) {
        let receiptsResults = {};
        try {
          const receiptsPromise = context.auth.sendReceipts({
            network: kudosNetwork,
            address: kudosAddress,
            poolId,
            receipts,
          });
          receiptsResults = await waitFor(receiptsPromise, {
            text: `Sending receipts...`,
          });
          receipts = []; // reset
          if (context.debug) {
            log(chalk.bold(`send: receiptsResults:`));
            log(JSON.stringify(receiptsResults, null, 2));
          }
        } catch (error) {
          log(
            chalk.red(
              `Be careful of double processing! Check transaction history, edit pool before trying again.`
            )
          );
          log(chalk.red(`Error saving receipts: ${error.message}`));
          process.exit(1);
        }
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
          identResolver,
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

      // checkpoint: send receipts
      if (receipts.length) {
        let receiptsResults = {};
        try {
          const receiptsPromise = context.auth.sendReceipts({
            network: kudosNetwork,
            address: kudosAddress,
            poolId,
            receipts,
          });
          receiptsResults = await waitFor(receiptsPromise, {
            text: `Sending receipts...`,
          });
          if (context.debug) {
            log(chalk.bold(`send: receiptsResults:`));
            log(JSON.stringify(receiptsResults, null, 2));
          }
          receipts = []; // reset
        } catch (error) {
          log(
            chalk.red(
              `Be careful of double processing! Check transaction history, edit pool before trying again.`
            )
          );
          log(chalk.red(`Error saving receipts: ${error.message}`));
          process.exit(1);
        }
      }

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
