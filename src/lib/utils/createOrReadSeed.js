import {
  BaseDirectory,
  createDir,
  exists,
  readTextFile,
  writeFile,
} from '@tauri-apps/api/fs';

import { appLocalDataDir } from '@tauri-apps/api/path';
import {createHdKeyFromMnemonic} from './wallet/createHdKeyFromMnemonic';
import {decryptAES} from './wallet/decryptAES';
import {encryptAES} from './wallet/encryptAES';
import {generateMnemonic} from './wallet/generateMnemonic';

export default async function createOrReadSeed({ password = 'password', id = 0 }) {

  const s = {};
  console.log('z');
  const baseDir = await appLocalDataDir();
  console.log('baseDir', baseDir);
  await createDir(`${baseDir}state`, {
    // dir: baseDir,
    recursive: true,
  });

  const fullPath = `${baseDir}state/setlr-${id}.seed`;
  console.log({ fullPath });

  try {
    const fileFound = await exists(fullPath);
    if (fileFound) {
      console.log('Seed phrase exists');

        const data = await readTextFile(fullPath);
        s.seed = decryptAES(data, password);
        // generate hd key
        s.hdkey = createHdKeyFromMnemonic(s.seed, password);
        console.log("Read Existing Seed from storage");
        return s;
    
      // fs.readFile(filename, 'utf8', async function (err, data) {
      //     s.seed = decryptAES(data, s.password)
      //     // generate hd key
      //     s.hdkey = createHdKeyFromMnemonic(s.seed, s.password)
      //  //   console.log("Read Existing Seed from storage");
      //     res()
      // });
    } else {
      throw new Error('File not found');
    }
  } catch (err) {
    if (err && err.message === 'File not found') {
        console.log('No Seed yet. Creating new one', err);

        s.seed = generateMnemonic();
    
        // generate hd key and encrypt with password
        s.hdkey = createHdKeyFromMnemonic(s.seed, password);
        const encryptedS = encryptAES(s.seed, password);
    
        // save in local file
        console.log('saving new encrypted seed phrase!', encryptedS, { s });
        try {
            await writeFile({ contents: encryptedS, path: fullPath });
        } catch (ee) {
            console.log('error writing file', ee);
        }    
    } else {
        //  Invalid mnemonic
        console.log('Invalid mnemonic', err);
        // TODO: handle this error... we don't want to overwrite the seed
        throw err;
    }
  }

 return s;
}
