import CryptoJS from "crypto-js";

export const decryptAES = (encryptedSeedPhrase: string | CryptoJS.lib.CipherParams, password: any) => {
  const our_password = password ? password : "banister";
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedSeedPhrase, our_password);

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    return "";
  }
};
