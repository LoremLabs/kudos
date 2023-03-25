import yaml from "yaml";
import fs from "fs";
import process from "process";
import chalk from "chalk";

const log = console.log;

const mappingDir = process.env.IDENT_AGENCY_DNS_MAPPING_DIR || "./data";

// read each file of directory ending in .yml
const files = fs
  .readdirSync(mappingDir)
  .filter((file) => file.endsWith(".yml"));

// read each file and parse yaml
const mappings = {};
files.map((file) => {
  const thisMapping = yaml.parse(
    fs.readFileSync(`${mappingDir}/${file}`, "utf8")
  );
  mappings[file.replace(/\..*$/, "")] = thisMapping;
});

export default mappings;
