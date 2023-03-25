// import { appConfigDir } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/tauri';
// import toml from '@iarna/toml';

// let configCache = null;
let saltCache = null;

export const getSalt = async (useCache) => {
  if (useCache && saltCache) {
    return saltCache;
  }

  let salt = '';
  try {
    salt = (await invoke('get_salt')) || ''; // used to encrypt local seed data only
    if (salt) {
      saltCache = salt;
    }
  } catch (e) {
    console.log('error getting salt', e);
  }
  return salt;
};

// export const readConfig = async (useCache) => {
//   if (useCache && configCache) {
//     return configCache;
//   }

//   let config = {};
//   try {
//     // get config from env-paths.config
//     // parse as toml
//     const configPath = await appConfigDir();
//     const configToml = await fs.readFileSync(configPath, 'utf8');
//     config = toml.parse(configToml);
//     console.log({fromFile: config, paths});
//   } catch (e) {
//     console.log('error reading config', e);
//   }
//   return config;
// };

export const setConfig = async (/** @type {Object} */ config) => {
  console.log('deprecated setconfig');
  // let ok = false;
  // try {
  //   // get config from env-paths.config
  //   // parse as toml
  //   const paths = envPaths('setler');
  //   const configToml = toml.stringify(config);
  //   await fs.writeFileSync(paths.config, configToml, 'utf8');
  //   ok = true;
  // } catch (e) {
  //   console.log('error saving config', e);
  // }
  // return ok;
};

export const getConfig = async (useCache) => {
  console.log('deprecated getConfig');
  // let config = {};
  // try {
  //   // const configJson = await invoke('get_config');
  //   config = await readConfig(useCache);
  //   configCache = config;
  // } catch (e) {
  //   console.log('error getting config', e);
  // }
  // return config;
};
