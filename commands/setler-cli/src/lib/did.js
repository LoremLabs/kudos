import { DEFAULTS } from "./config.js";

const log = console.log;

export const expandDid = async ({ did, identResolver, network }) => {
  // TODO: use a general purpose did resolver, this is hard-coded to kudos dids

  const identityResolver = identResolver || DEFAULTS.IDENTITY.RESOLVER;

  const gqlQuery = {
    query: `query LookupPayVia($identifier: String!) {
        payVia(identifier: $identifier) {
          type
          value
        }
       }`,

    variables: {
      identifier: did,
    },
    operationName: "LookupPayVia",
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
            const errMsg = json.data?.LookupPayVia?.status || "";
            throw new Error(errMsg);
          }
          throw new Error("Error submitting did lookup");
        }

        const out = await r.json();
        //        console.log("out", out);
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

  const payVias = results.data.payVia || [];
  // search for our network
  const payVia = payVias.find((p) => p.type === network);
  if (payVia) {
    return payVia.value;
  }
  return null;
};
