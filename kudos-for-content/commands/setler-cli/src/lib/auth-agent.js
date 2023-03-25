import { DEFAULTS } from "./config.js";
import { deriveAddressFromBytes } from "./wallet/keys.js";
import fetch from "node-fetch";
import { hexToBytes as hexTo } from "@noble/hashes/utils";
import { shortId } from "./short-id.js";

const log = console.log;

// import { fetchToCurl } from "fetch-to-curl";

// wrapper for auth things
export const AuthAgent = function ({ context }) {
  this.context = context;

  // identResolver is context.
};

AuthAgent.prototype.startAuth = async function ({ did }) {
  // what type of did is this?
  // did:kudos:email:foo => didType = kudos:email
  const didType = did.split(":")[1] + ":" + did.split(":")[2];

  // generate a random state
  const state =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  // log({state});

  switch (didType) {
    case "kudos:email": {
      // get email
      const email = did.split(":")[3];
      return this.startEmailAuth({ email, state });
      break;
    }
    default: {
      throw new Error("Unknown Did Type");
    }
  }
};

const hexToBytes = (hex) => {
  // check if it's a hex string, starting with 0x
  if (typeof hex === "string" && hex.match(/^0x([0-9a-f][0-9a-f])*$/i)) {
    // strip off the 0x
    hex = hex.slice(2);
  }

  return hexTo(hex);
};

AuthAgent.prototype.startEmailAuth = async function ({ email, state }) {
  const context = this.context;
  // post to ident agent api which will send a code to the email address

  if (!context.keys) {
    context.keys = await context.vault.keys();
  }
  log(`keys: ${JSON.stringify(context.keys, null, "  ")}`);

  // get our address from the context
  const a = hexToBytes(context.keys.kudos.publicKey);
  const address = deriveAddressFromBytes(a);

  const payload = JSON.stringify({
    state,
  });

  // sign the payload
  const { signature, recId } = await context.vault.sign({
    keys: context.keys.kudos,
    message: payload,
    signingKey: context.keys.kudos.privateKey,
  });

  // log ({signature, recId});

  // const verified = await context.vault.verify({
  //   keys: context.keys.kudos,
  //   message: payload,
  //   signature,
  // });

  // log({verified});

  const request = {
    address,
    rid: shortId(),
    path: "/auth/email/login",
    in: payload,
    signature: `${signature}${recId}`, // TODO: is there a standard for this?
  };

  log({ request });
};

export const expandDid = async ({ did, network }) => {
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
    // console.log(fetchToCurl(`${identityResolver}/api/v1/gql`, options));
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
