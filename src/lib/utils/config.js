import { invoke } from '@tauri-apps/api/tauri';

export const getConfig = async () => {
  let config = {};
  try {
    const configJson = await invoke('get_config');
    console.log('configJson', configJson);
    config = JSON.parse(configJson);
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
