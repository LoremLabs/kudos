import { DEFAULTS } from "./config.js";
import fetch from "node-fetch";
import { fetchToCurl } from "fetch-to-curl";

const log = console.log;

export const expandDid = async ({ did, identResolver, network, debug, kudosLog = true }) => {
  // TODO: use a general purpose did resolver, this is hard-coded to kudos dids

  let identityResolver = identResolver || DEFAULTS.IDENTITY.RESOLVER;
  identResolver = identResolver.trim();
  if (identResolver.endsWith("/")) {
    identResolver = identResolver.slice(0, -1);
  }

  const gqlQuery = {
    query: `query SocialPay($identifier: String!, $features: SocialPayFeatures) {
        socialPay(identifier: $identifier, features: $features) {
            paymentMethods {
              type
              value
              note
            }
            
            escrowMethods {
              type
              address
              time
              fee
              terms
              onExpiration
            }

            kudosLogMethods {
              identifier
              type
              address
            }

            status {
              message
              code
            }
        }
       }`,

    variables: {
      identifier: did,
      features: {
        kudosLog,
      }
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
    if (debug) {
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
        if (debug) {
          console.log('out', JSON.stringify(out,null,2));
        }
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

  // see if we have kudos logs
  const kudosLogMethods = results?.data?.socialPay?.kudosLogMethods || [];
  const kudosLogConfig = kudosLogMethods.find((p) => p.type === network);

  const payVias = results?.data?.socialPay?.paymentMethods || [];
  // search for our network
  const payVia = payVias.find((p) => p.type === network);
  if (payVia) {
    return { directPaymentVia: payVia.value, escrowMethod: null, kudosLogConfig };
  }

  // otherwise we search for an escrow that matches
  const escrowMethods = results?.data?.socialPay?.escrowMethods || [];
  // search for our network
  const escrowMethod = escrowMethods.find((p) => p.type === network);
  if (escrowMethod) {
    const e = new Error("Escrow only");
    e.extra = { directPaymentVia: null, escrowMethod, kudosLogConfig };
    throw e;
  }

  if (kudosLogConfig) {
    const e = new Error("KudosLog only");
    e.extra = { directPaymentVia: null, escrowMethod: null, kudosLogConfig };
    throw e;
  }

  return { directPaymentVia: null, escrowMethod: null, kudosLogConfig: null };
};
