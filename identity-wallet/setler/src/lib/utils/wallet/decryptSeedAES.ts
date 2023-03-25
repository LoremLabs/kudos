import CryptoJS from 'crypto-js';

export const decryptAES = (
  encryptedSeedPhrase: string | CryptoJS.lib.CipherParams,
  salt: any
) => {
  const our_salt = salt ? salt : 'banister'; // used for local encryption of files only
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedSeedPhrase, our_salt);

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    return '';
  }
};
