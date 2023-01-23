import CryptoJS from 'crypto-js';

export const encryptAES = (
  seedPhrase: string | CryptoJS.lib.WordArray,
  password: string | CryptoJS.lib.WordArray
) => {
  const encrypted = CryptoJS.AES.encrypt(seedPhrase, password);
  return encrypted.toString();
};
