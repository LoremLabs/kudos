import CryptoJS from 'crypto-js';

export const encryptAES = (
  seedPhrase: string | CryptoJS.lib.WordArray,
  salt: string | CryptoJS.lib.WordArray
) => {
  const our_salt = salt ? salt : 'banister';

  const encrypted = CryptoJS.AES.encrypt(seedPhrase, our_salt);
  return encrypted.toString();
};
