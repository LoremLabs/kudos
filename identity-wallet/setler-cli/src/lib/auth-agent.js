// import { bytesToHex, hexToBytes as hexTo } from "@noble/hashes/utils";

import * as http from "http";

import { DEFAULTS } from "./config.js";
// import { deriveAddressFromBytes } from "./wallet/keys.js";
import fetch from "node-fetch";
import { fetchToCurl } from "fetch-to-curl";
import { shortId } from "./short-id.js";

const log = console.log;

// wrapper for auth things
export const AuthAgent = function ({ context }) {
  this.context = context;
  let identResolver =
    context.config.identity?.identResolver || DEFAULTS.IDENTITY.RESOLVER; // error if not set
  // trim any leading or trailing whitespace
  identResolver = identResolver.trim();
  if (identResolver.endsWith("/")) {
    identResolver = identResolver.slice(0, -1);
  }
  this.identResolver = identResolver;
};

AuthAgent.prototype.inkKudos = async function ({
  address,
  kudos,
  network,
  poolId,
}) {
  if (!poolId) {
    throw new Error("Pool ID is required");
  }

  const request = await this.createPoolRequest({
    network,
    payload: {
      address,
      kudos,
      poolId,
    },
    path: "/pool/ink",
    signIt: false,
  });

  // TODO: send along the auth header that the gql expects
  // should get from process.env?

  const { response, status } = await this.sendToPool({ request });
  if (this.context.debug) {
    log({ response, status });
  }

  if (status.code !== 200) {
    // log({ response, status });
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status };
};

AuthAgent.prototype.getPool = async function ({ address, network, poolId }) {
  const request = await this.createPoolRequest({
    network,
    payload: {
      poolId,
      address,
    },
    path: "/pool/get/details",
    includeAuth: true,
  });
  const { response, status } = await this.sendToPool({ request });
  // log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status };
};

AuthAgent.prototype.getPoolSummary = async function ({
  address,
  amount,
  network,
  poolId,
}) {
  const request = await this.createPoolRequest({
    network,
    payload: {
      poolId,
      address,
      amount,
    },
    path: "/pool/get/summary",
    includeAuth: true,
  });
  const { response, status } = await this.sendToPool({ request });
  // log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status };
};

AuthAgent.prototype.listPools = async function ({ matching, network }) {
  const request = await this.createPoolRequest({
    network,
    payload: {
      matching,
    },
    path: "/pool/list",
  });
  const { response, status } = await this.sendToPool({ request });
  // log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status };
};

AuthAgent.prototype.createPool = async function ({ network, poolName }) {
  const payload = {
    poolName,
  };

  const request = await this.createPoolRequest({
    network,
    payload,
    path: "/pool/create",
  });
  const { response, status } = await this.sendToPool({ request });
  // log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status };
};

AuthAgent.prototype.startAuth = async function ({ did, network }) {
  // what type of did is this?
  // did:kudos:email:foo => didType = kudos:email
  const didType = did.split(":")[1] + ":" + did.split(":")[2];

  const nonce =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  switch (didType) {
    case "kudos:email": {
      // get email
      const email = did.split(":")[3];
      return this.startEmailAuth({ email, nonce, network });
    }
    case "kudos:twitter": {
      // get email
      const twitterHandle = did.split(":")[3];
      return this.startOAuth({
        params: { twitterHandle },
        type: "twitter",
        nonce,
        network,
      });
    }
    default: {
      throw new Error("Unknown Did Type");
    }
  }
};

// const hexToBytes = (hex) => {
//   // check if it's a hex string, starting with 0x
//   if (typeof hex === "string" && hex.match(/^0x([0-9a-f][0-9a-f])*$/i)) {
//     // strip off the 0x
//     hex = hex.slice(2);
//   }

//   return hexTo(hex);
// };

AuthAgent.prototype.verifyAuthCode = async function ({
  rid,
  code,
  nonce,
  network,
}) {
  const context = this.context;

  if (!context.keys) {
    context.keys = await context.vault.keys();
  }

  // get the key from the network
  const networkParts = network.split(":");
  let keys;
  if (networkParts.length === 1) {
    keys = context.keys[network];
  } else {
    keys = context.keys[networkParts[0]][networkParts[1]];
  }

  let { privateKey, address } = keys;
  privateKey = normalizePrivateKey(privateKey);

  const payload = JSON.stringify({
    nonce,
    code,
    rid,
    address, // keep in the payload
  });

  // sign the payload
  const { signature, recId } = await context.vault.sign({
    keys,
    message: payload,
    signingKey: privateKey,
  });

  const request = {
    rid: shortId(),
    path: "/auth/email/verify",
    in: payload,
    signature: `${signature}${recId}`, // TODO: is there a standard for this? recId is 0 or 1
  };

  // log({ request });

  const { response, status } = await this.sendToPool({ request });
  //log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status, nonce };
};

const normalizePrivateKey = (privateKey) => {
  if (typeof privateKey === "string") {
    if (privateKey.length === 66) {
      // remove 00 prefix
      privateKey = privateKey.slice(2);
    }
  }

  return privateKey;
};

AuthAgent.prototype.sendReceipts = async function ({
  address,
  network,
  poolId,
  receipts,
}) {
  const request = await this.createPoolRequest({
    network,
    payload: {
      poolId,
      address,
      receipts,
    },
    path: "/pool/ink/receipts",
    includeAuth: true,
  });
  const { response, status } = await this.sendToPool({ request });
  // log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status };
};

AuthAgent.prototype.createPoolRequest = async function ({
  network,
  path,
  payload,
  rid,
  signIt = true,
  includeAuth = false,
}) {
  const context = this.context;
  if (!context.keys) {
    context.keys = await context.vault.keys();
  }

  // get the key from the network
  const networkParts = network.split(":");
  let keys;
  if (networkParts.length === 1) {
    keys = context.keys[network];
  } else {
    keys = context.keys[networkParts[0]][networkParts[1]];
  }

  let { privateKey: signingKey, address } = keys;
  signingKey = normalizePrivateKey(signingKey);

  const message = JSON.stringify({ ...payload, address });

  let signature, authorization;

  if (signIt) {
    // sign the payload
    const signed = await context.vault.sign({
      keys,
      message,
      signingKey,
    });
    signature = `${signed.signature}${signed.recId}`; // TODO: is there a standard for this? recId is 0 or 1
  } else {
    // use authorization
    authorization = process.env.KUDOS_STORAGE_TOKEN;
    if (!authorization) {
      throw new Error("Missing KUDOS_STORAGE_TOKEN");
    }
  }
  const request = {
    rid: rid || shortId(),
    path,
    in: message,
  };

  if (signIt) {
    request.signature = signature;
  } else {
    request.authorization = authorization;
  }

  if (includeAuth) {
    // is optional
    if (process.env.KUDOS_STORAGE_TOKEN) {
      request.authorization = process.env.KUDOS_STORAGE_TOKEN;
    }
  }

  return request;
};

AuthAgent.prototype.startOAuth = async function ({
  params,
  nonce,
  type,
  network,
}) {
  const context = this.context;

  if (!context.keys) {
    context.keys = await context.vault.keys();
  }

  // get the key from the network
  const networkParts = network.split(":");
  let keys;
  if (networkParts.length === 1) {
    keys = context.keys[network];
  } else {
    keys = context.keys[networkParts[0]][networkParts[1]];
  }

  let { privateKey, address } = keys;
  privateKey = normalizePrivateKey(privateKey);

  // start a web server to listen for the callback
  let server;
  const oAuthDone = new Promise((resolve, reject) => {
    server = http.createServer(async (req, res) => {
      const { url } = req;

      const { pathname, searchParams } = new URL(url, `http://localhost`);

      if (pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<html><title>Setler CLI</title><body>You found an ephemeral server.</body></html>`
        );
        return;
      } else if (pathname === "/oauth") {
        // this is the oauth callback
        const state = searchParams.get("state");

        //log({ oauth_token, oauth_verifier });

        res.writeHead(200, { "Content-Type": "text/html" });

        if (state === nonce) {
          res.end(
            `<html><title>Close me</title><body>Ok, you can close this window now.</body></html>`
          );
          resolve();
        } else {
          res.end(
            `<html><title>Close me</title><body>Something went wrong. Please try again.</body></html>`
          );
          reject();
        }

        setTimeout(() => {
          server.close();
        }, 1000);

        return;
      } else if (pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      } else {
        res.writeHead(404);
        res.end(`Not found`);
        return;
      }
    });
  });
  await server.listen();
  const srv = server.address();
  let callbackUrl = `http://localhost:${srv.port}/oauth`;

  const payload = JSON.stringify({
    nonce,
    params, // the params for the oauth provider
    type, // twitter, etc.
    address, // keep in the payload
    callbackUrl,
  });

  // sign the payload
  const { signature, recId } = await context.vault.sign({
    keys,
    message: payload,
    signingKey: privateKey,
  });

  const request = {
    rid: shortId(),
    path: "/auth/start",
    in: payload,
    signature: `${signature}${recId}`, // TODO: is there a standard for this? recId is 0 or 1
  };

  // log({ request });

  // this starts the oauth process
  const { response, status } = await this.sendToPool({ request });
  //log({ response, status });
  let out;
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  } else {
    try {
      out = JSON.parse(response.out);
    } catch (e) {
      throw new Error(`Invalid response: ${response.out}`);
    }
  }

  return { response, status, nonce, out, oAuthDone };
};

AuthAgent.prototype.startEmailAuth = async function ({
  email,
  nonce,
  network,
}) {
  const context = this.context;
  // post to ident agent api which will send a code to the email address

  if (!context.keys) {
    context.keys = await context.vault.keys();
  }

  // get the key from the network
  const networkParts = network.split(":");
  let keys;
  if (networkParts.length === 1) {
    keys = context.keys[network];
  } else {
    keys = context.keys[networkParts[0]][networkParts[1]];
  }

  let { privateKey, address } = keys;
  privateKey = normalizePrivateKey(privateKey);

  const payload = JSON.stringify({
    nonce,
    email,
    address, // keep in the payload
  });

  // sign the payload
  const { signature, recId } = await context.vault.sign({
    keys,
    message: payload,
    signingKey: privateKey,
  });

  const request = {
    rid: shortId(),
    path: "/auth/email/login",
    in: payload,
    signature: `${signature}${recId}`, // TODO: is there a standard for this? recId is 0 or 1
  };

  // log({ request });

  const { response, status } = await this.sendToPool({ request });
  //log({ response, status });
  if (status.code !== 200) {
    const e = new Error(status.message);
    e._status = status;
    e._response = response;
    throw e;
  }

  return { response, status, nonce };
};

AuthAgent.prototype.sendToPool = async function ({ request, identResolver }) {
  // NB: param is identResolver, not identityResolver
  let identityResolver =
    identResolver || this.identResolver || DEFAULTS.IDENTITY?.RESOLVER;

  identityResolver = identityResolver.trim();
  if (identityResolver.endsWith("/")) {
    identityResolver = identityResolver.slice(0, -1);
  }

  const gqlQuery = {
    query: `mutation PoolRequest($requestId: String!, $path: String!, $in: String!, $signature: String!) {
      submitPoolRequest(rid: $requestId, path: $path, in: $in, signature: $signature) {
        status {
          code
          message
        }
        response {
          rid
          path
          out
          signature,
        }
      }
    }`,

    variables: {
      requestId: request.rid,
      path: request.path,
      in: request.in,
      signature: request.signature || "auth",
    },
    operationName: "PoolRequest",
    extensions: {},
  };
  // console.log('gqlQuery', gqlQuery);
  let results = {};

  if (!identityResolver) {
    throw new Error("identResolver is required");
  }

  // TODO: it would be better to batch these rather than one at a time...
  try {
    const headers = {
      accept: "application/json",
      "content-type": "application/json",
    };

    if (request.authorization) {
      headers.authorization = request.authorization;
    }

    const options = {
      headers,
      method: "POST",
      body: JSON.stringify(gqlQuery),
    };
    if (this.context.debug) {
      console.log("---------------sending to pool----------", request);
      console.log(fetchToCurl(`${identityResolver}/api/v1/gql`, options));
    }

    // remove trailing slash if it's on identityResolver
    results = await fetch(`${identityResolver}/api/v1/gql`, options).then(
      async (r) => {
        // check status code
        if (r.status !== 200) {
          log(`\nError submitting pool request: ${r.status} ${r.statusText}\n`);
          const json = await r.json(); // not guaranteed to be json :(
          if (json) {
            const errMsg = json.data?.PoolRequest?.status?.message || "";
            throw new Error(errMsg);
          }
          throw new Error("Error submitting pool request");
        }

        const out = await r.json();
        //        console.log('out', r.status, JSON.stringify(out,null,2));
        return out;
      }
    );
  } catch (e) {
    console.log("error fetching pool request", e);
    results.status = {
      message: "Error fetching pool request: " + e.message,
      code: 500,
    };

    return results;
  }

  // console.log({ results });

  const response = results?.data?.submitPoolRequest?.response || {};
  const status = results?.data?.submitPoolRequest?.status || {};

  return { response, status };
};

export const expandDid = async ({ did, network, identResolver }) => {
  // TODO: use a general purpose did resolver, this is hard-coded to kudos dids

  const identityResolver = identResolver || DEFAULTS.IDENTITY.RESOLVER;

  const gqlQuery = {
    query: `query SocialPay($identifier: String!) {
        socialPay(identifier: $identifier) {
            paymentMethods {
                type
                value
              }
              escrowMethods {
                type
                address
                time
                fee
                terms
                onExpiration
              }
              status {
                message
                code
              }
        }
       }`,

    variables: {
      identifier: did,
    },
    operationName: "SocialPay",
    extensions: {},
  };
  // console.log('gqlQuery', gqlQuery);
  let results = {};

  if (!identityResolver) {
    throw new Error("identResolver is required");
  }

  // TODO: it would be better to batch these rather than one at a time...
  try {
    const headers = {
      accept: "application/json",
      "content-type": "application/json",
    };

    const options = {
      headers,
      method: "POST",
      body: JSON.stringify(gqlQuery),
    };

    if (this.context.debug) {
      console.log(fetchToCurl(`${identityResolver}/api/v1/gql`, options));
    }

    results = await fetch(`${identityResolver}/api/v1/gql`, options).then(
      async (r) => {
        // check status code
        if (r.status !== 200) {
          log(`\nError submitting did lookup: ${r.status} ${r.statusText}\n`);
          const json = await r.json(); // not guaranteed to be json :(
          if (json) {
            const errMsg = json.data?.SocialPay?.status?.message || "";
            throw new Error(errMsg);
          }
          throw new Error("Error submitting did lookup");
        }

        const out = await r.json();
        // console.log('out', JSON.stringify(out,null,2));
        return out;
      }
    );
  } catch (e) {
    console.log("error fetching gql", e);
    // addToast({
    //   msg: 'Error submitting Kudos for Fame. Check your network connection and try again.',
    //   type: 'error',
    //   duration: 3000,
    // });
    results.status = {
      message: "Error fetching did: " + e.message,
      code: 500,
    };

    return results;
  }

  const payVias = results?.data?.socialPay?.paymentMethods || [];
  // search for our network
  const payVia = payVias.find((p) => p.type === network);
  if (payVia) {
    return { directPaymentVia: payVia.value, escrowMethod: null };
  }

  // otherwise we search for an escrow that matches
  const escrowMethods = results?.data?.socialPay?.escrowMethods || [];
  // search for our network
  const escrowMethod = escrowMethods.find((p) => p.type === network);
  if (escrowMethod) {
    const e = new Error("Escrow only");
    e.extra = { directPaymentVia: null, escrowMethod };
    throw e;
  }

  return { directPaymentVia: null, escrowMethod: null };
};

// // get auth url
// const authUrl = await this.context.coins.getAuthUrl({ email });
// // open auth url
// const open = require("open");
// open(authUrl);
// // ask user to enter code
// const prompts = require("prompts");
// const response = await prompts({
//   type: "text",
//   name: "code",
//   message: "Enter code:",
// });
// const code = response.code;
// if (!code) {
//   throw new Error("Please provide a code");
// }
// // get auth token
// const authToken = await this.context.coins.getAuthToken({ email, code });
// // save auth token
// this.context.config.set("authToken", authToken);
// // return auth token
// return authToken;
