import { invoke } from '@tauri-apps/api/tauri';

let configCache = null;
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

export const getConfig = async (useCache) => {
  if (useCache && configCache) {
    return configCache;
  }

  let config = {};
  try {
    const configJson = await invoke('get_config');
    console.log('configJson', configJson);
    config = JSON.parse(configJson);
    configCache = config;
  } catch (e) {
    console.log('error getting config', e);
  }
  return config;
};

export const setConfig = async (/** @type {Object} */ config) => {
  const configJson = JSON.stringify(config || {});
  console.log('setConfig', configJson);
  let ok = false;
  try {
    // @ts-ignore
    ok = await invoke('set_config', { configJson });
    console.log({ ok });
  } catch (e) {
    console.log('error setting config', e);
  }

  return ok;
};
