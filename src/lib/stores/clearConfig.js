import { createDir, exists, readTextFile, writeFile } from '@tauri-apps/api/fs';

import { appLocalDataDir } from '@tauri-apps/api/path';
// import { invoke } from '@tauri-apps/api/tauri';
import { writable } from 'svelte/store';

export const createClearConfigStore = () => {
  const data = {};
  const { subscribe, update, set } = writable(data);

  return {
    init: async () => {
      let clearConfig = {};
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
            console.log('config exists');

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

      console.log({ clearConfig });
      set(clearConfig);
      return clearConfig;
    },
    subscribe,
    save: async (newData = {}) => {
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
    },
    update,
  };
};

export const clearConfigStore = createClearConfigStore();
