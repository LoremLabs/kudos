import CryptoJS from "crypto-js";

export const encryptAES = (seedPhrase, password) => {
  const encrypted = CryptoJS.AES.encrypt(seedPhrase, password);
  return encrypted.toString();
};
