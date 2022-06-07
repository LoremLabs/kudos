// import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

import dns from "dns";

const devLog = process.env.KUDOS_DEBUG === "true" ? console.log : () => {};

const identToPaymentAddress = async (identifier) => {
  // if we're running in dev mode, use our own servers
  if (process.env.IDENTAGENCY_RESOLVER) {
    devLog(
      `Using custom ident.agency resolver: ${process.env.IDENTAGENCY_RESOLVER}`
    );
    dns.setServers([process.env.IDENTAGENCY_RESOLVER]); // 127.0.0.1:5053
  }

  let paymentAddress = "";
  try {
    paymentAddress = await dns.promises.resolveTxt(
      `_kudos.${identifier}.ident.agency`
    );
  } catch (err) {
    devLog(`Error resolving paymentAddress: ${err}`);
    if (err === "ENODATA") {
      return "";
    }
  }
  if (paymentAddress.length === 0) {
    // throw new Error(`No XRPL ledger address found for ${identifier}`);
    return "";
  }
  // console.log({ paymentAddress, identifier });
  // console.log('account', paymentAddress[0][0]);
  return paymentAddress[0][0];
};

export { identToPaymentAddress };
