import envPaths from "env-paths";
import fs from "fs";
import toml from "@iarna/toml";

// const log = console.log;

export const defaultConfig = {
  _init: false,
  identity: {
    identResolver: "https://graph.ident.agency",
  },
  networks: {
    "xrpl:livenet": true,
    "xrpl:testnet": true,
    "xrpl:devnet": false,
  },
  personas: [{ id: 0, name: "Persona 1" }],
};

export const configDir = envPaths("setler", {
  suffix: "",
}).data;

export const configFile = `${configDir}/config.toml`;

export const readConfig = () => {
  let config = {};
  if (fs.existsSync(configFile)) {
    const configData = fs.readFileSync(configFile, "utf8");
    config = toml.parse(configData);
  }
  return config;
};

export const writeConfig = (config) => {
  const contents = toml.stringify(config);
  fs.writeFileSync(configFile, contents);
};

export const existsConfig = () => {
  return fs.existsSync(configFile);
};

export const initConfig = () => {
  if (!existsConfig()) {
    writeConfig(defaultConfig);
  }
  return readConfig();
};

export const DEFAULTS = {
  ENDPOINTS: {
    "xrpl:livenet": "wss://xrplcluster.com",
    "xrpl:testnet": "wss://testnet.xrpl-labs.com",
    "xrpl:devnet": "wss://s.devnet.rippletest.net",
  },
  IDENTITY: {
    RESOLVER: "https://graph.ident.agency",
  },
};

// given a network type, return an endpoint we can connect to
export const getEndpoint = async (clientType, cachedConfig) => {
  // get the endpoint
  const config = cachedConfig || initConfig();

  switch (clientType) {
    case "xrpl:livenet":
      return (
        config?.advEndpoints?.xrplLiveNetEndpoint ||
        DEFAULTS.ENDPOINTS[clientType]
      );
    case "xrpl:testnet":
      return (
        config?.advEndpoints?.xrplTestNetEndpoint ||
        DEFAULTS.ENDPOINTS[clientType]
      );
    case "xrpl:devnet":
      return (
        config?.advEndpoints?.xrplDevNetEndpoint ||
        DEFAULTS.ENDPOINTS[clientType]
      );
    default:
      return "";
  }
};

export const setEndpoint = async (clientType, endpoint, cachedConfig) => {
  const config = cachedConfig || initConfig();

  switch (clientType) {
    case "xrpl:livenet":
      config.advEndpoints.xrplLiveNetEndpoint = endpoint;
      break;
    case "xrpl:testnet":
      config.advEndpoints.xrplTestNetEndpoint = endpoint;
      break;
    case "xrpl:devnet":
      config.advEndpoints.xrplDevNetEndpoint = endpoint;
      break;
    default:
      break;
  }

  writeConfig(config);

  return config;
};
