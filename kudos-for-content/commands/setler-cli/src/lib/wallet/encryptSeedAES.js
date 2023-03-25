import CryptoJS from "crypto-js";

export const encryptAES = (seedPhrase, salt) => {
  const our_salt = salt ? salt : "banister";

  const encrypted = CryptoJS.AES.encrypt(seedPhrase, our_salt);
  return encrypted.toString();
};
