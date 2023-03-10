import { appConfigDir, appLocalDataDir } from '@tauri-apps/api/path';
import { createDir, exists, readTextFile, writeFile } from '@tauri-apps/api/fs';

import { addToast } from '$lib/stores/toasts';
import toml from '@iarna/toml';
import { writable } from 'svelte/store';

// import { invoke } from '@tauri-apps/api/tauri';

let initDone = false;

export const defaultClearConfig = {
  _init: false,
  identity: {
    identResolver: 'https://graph.ident.agency',
  },
  networks: {
    'xrpl:livenet': true,
    'xrpl:testnet': true,
    'xrpl:devnet': false,
  },
  personas: [{ id: 0, name: 'Persona 1' }],
};

export const createClearConfigStore = () => {
  let clearConfig = {
    ...defaultClearConfig,
  };
  const { subscribe, update, set } = writable(clearConfig);

  const save = async (
    newData = {
      _init: false,
      personas: [{ id: 0, name: 'Persona 1' }],
    }
  ) => {
    try {
      const baseDir = await appConfigDir();
      //      const baseDir = await appLocalDataDir();
      console.log({ baseDir });
      await createDir(`${baseDir}`, {
        // dir: baseDir,
        recursive: true,
      });

      const fullPath = `${baseDir}/config.toml`;
      console.log({ fullPath, newData });
      const contents = toml.stringify(newData);

      await writeFile({ contents, path: fullPath });
    } catch (e) {
      console.log('error saving clear config', e);
      addToast({
        msg: 'Error saving config',
        type: 'error',
        duration: 5000,
      });
      return;
    }

    set(newData);
  };

  const init = async () => {
    if (initDone) {
      console.log('using cached init config');
      return clearConfig;
    }
    const baseDir = await appLocalDataDir();
    console.log({ baseDir });

    try {
      await createDir(`${baseDir}`, {
        // dir: baseDir,
        recursive: true,
      });

      const fullPath = `${baseDir}/config.toml`;

      // read clear config file
      try {
        const fileFound = await exists(fullPath);
        console.log({ fileFound });
        if (fileFound) {
          // console.log('config exists');

          const configTomlData = await readTextFile(fullPath);
          clearConfig = toml.parse(configTomlData);
        } else {
          throw new Error('File not found');
        }
      } catch (err) {
        if (err && err.message === 'File not found') {
          console.log('No clear config yet. Creating new one', err);

          try {
            await writeFile({ contents: toml.stringify({}), path: fullPath });
          } catch (ee) {
            console.log('error writing clear config file', ee);
          }
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.log('Error getting clear config', e, e.message);
      addToast({
        msg: 'Error getting config',
        type: 'error',
        duration: 5000,
      });
      return;
    }

    clearConfig._init = true; // allow derived stores to know when init is done
    clearConfig.personas = clearConfig.personas || [
      { id: 0, name: 'Persona 1' },
    ];
    initDone = true;
    // console.log({ clearConfig });
    set(clearConfig);
    return clearConfig;
  };

  // TODO: race condition
  // init();

  return {
    addPersona: async ({ name = 'Persona' }) => {
      if (!initDone) {
        throw new Error('init-not-done');
      }
      const newPersona = {
        id: clearConfig?.personas.length || 0,
        name,
      };
      clearConfig.personas.push(newPersona);
      await save(clearConfig);
      return newPersona;
    },
    changeActivePersona: async ({ id = 0 }) => {
      if (!initDone) {
        throw new Error('init-not-done');
      }
      // if (id === clearConfig.id) {
      //   return;
      // }
      clearConfig.personas.forEach((p) => {
        p.active = p.id === id;
      });
      await save(clearConfig);
    },
    updatePersona: async (id, newPersona) => {
      if (!initDone) {
        throw new Error('init-not-done');
      }

      const index = clearConfig.personas.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error('Persona not found');
      }
      clearConfig.personas[index] = newPersona;
      await save(clearConfig);
    },
    init,
    reset: async () => {
      initDone = false;
      clearConfig = {
        _init: false,
      };
      await save(clearConfig);
    },
    subscribe,
    save,
    update,
  };
};

export const clearConfigStore = createClearConfigStore();
