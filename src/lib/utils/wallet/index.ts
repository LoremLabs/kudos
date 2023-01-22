import { createHdKeyFromMnemonic } from './createHdKeyFromMnemonic';
import { decryptAES } from './decryptAES';
import { encryptAES } from './encryptAES';
import { generateMnemonic } from './generateMnemonic';

const wallet = {
  decryptAES,
  encryptAES,
  createHdKeyFromMnemonic,
  generateMnemonic,
};

export { wallet };
