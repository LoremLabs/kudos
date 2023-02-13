import { createDir, exists, readTextFile, writeFile } from '@tauri-apps/api/fs';

import { appLocalDataDir } from '@tauri-apps/api/path';
// import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

let initDone = false;

export const createClearConfigStore = () => {
  let clearConfig = {
    _init: false,
    personas: [{ id: 0, name: 'Persona 1' }],
  };
  const { subscribe, update, set } = writable(clearConfig);

  const save = async (
    newData = {
      _init: false,
      personas: [{ id: 0, name: 'Persona 1' }],
    }
  ) => {
    try {
      const baseDir = await appLocalDataDir();
      await createDir(`${baseDir}config`, {
        // dir: baseDir,
        recursive: true,
      });

      const fullPath = `${baseDir}config/clear.json`;
      await writeFile({ contents: JSON.stringify(newData), path: fullPath });
    } catch (e) {
      console.log('error saving clear config', e);
      // TODO: should this be a bigger error?
      alert('Error: CLEAR_CONFIG_SAVE');
    }

    set(newData);
  };

  return {
    addPersona: async ({ name = 'Persona' }) => {
      const newPersona = {
        id: clearConfig?.personas.length || 0,
        name,
      };
      clearConfig.personas.push(newPersona);
      await save(clearConfig);
      return newPersona;
    },
    changeActivePersona: async ({ id = 0 }) => {
      clearConfig.personas.forEach((p) => {
        p.active = p.id === id;
      });
      await save(clearConfig);
    },
    updatePersona: async (id, newPersona) => {
      const index = clearConfig.personas.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error('Persona not found');
      }
      clearConfig.personas[index] = newPersona;
      await save(clearConfig);
    },
    init: async () => {
      if (initDone) {
        console.log('using cached init config');
        return clearConfig;
      }
      try {
        const baseDir = await appLocalDataDir();
        await createDir(`${baseDir}config`, {
          // dir: baseDir,
          recursive: true,
        });

        const fullPath = `${baseDir}config/clear.json`;

        // read clear config file
        try {
          const fileFound = await exists(fullPath);
          if (fileFound) {
            // console.log('config exists');

            const configJsonData = await readTextFile(fullPath);
            clearConfig = JSON.parse(configJsonData);
          } else {
            throw new Error('File not found');
          }
        } catch (err) {
          if (err && err.message === 'File not found') {
            console.log('No clear config yet. Creating new one', err);

            try {
              await writeFile({ contents: JSON.stringify({}), path: fullPath });
            } catch (ee) {
              console.log('error writing clear config file', ee);
            }
          } else {
            throw err;
          }
        }
      } catch (e) {
        console.log('error getting clear config', e);
      }

      clearConfig._init = true; // allow derived stores to know when init is done
      clearConfig.personas = clearConfig.personas || [
        { id: 0, name: 'Persona 1' },
      ];
      initDone = true;
      console.log({ clearConfig });
      set(clearConfig);
      return clearConfig;
    },
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
