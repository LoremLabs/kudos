import { DEFAULTS } from "./config.js";
import fetch from "node-fetch";
// import { fetchToCurl } from 'fetch-to-curl'; // DEBUG

const log = console.log;

// network,
// sourceAddress,
// amount: currentAddress.amount,
// amountDrops: currentAddress.amountDrops,
// escrow: currentAddress.escrow,
// fulfillmentTicket,
// sequenceNumber: result.Sequence,
// cancelAfter: escrowTx.CancelAfter,

export const notifyEscrow = async ({
  network, // xrpl:livenet
  sourceAddress,
  viaAddress,
  escrowId,
  condition,
  fulfillmentTicket,
  sequenceNumber,
  identifier,
  amountDrops,
  cancelAfter,
  identResolver,
}) => {
  if (!network.startsWith("xrpl")) {
    throw new Error("Escrow is only supported on XRPL");
  }

  const identityResolver = identResolver || DEFAULTS.IDENTITY.RESOLVER;
  const operationName = "EscrowNotify";
  const gqlMutation = {
    query: `mutation EscrowNotify($address: String!,
              $viaAddress: String!,
              $identifier: String!
              $network: String!
              $amount: String!
              $fulfillmentTicket: String!
              $condition: String!
              $escrowId: String!
              $sequenceNumber: Int!
              $cancelAfter: Int
      ) {
        escrowNotify(address: $address
              viaAddress: $viaAddress
              identifier: $identifier
              network: $network
              amount: $amount
              condition: $condition
              escrowId: $escrowId
              fulfillmentTicket: $fulfillmentTicket
              sequenceNumber: $sequenceNumber
              cancelAfter: $cancelAfter
        ) {
             status {
            code
            message
          }
        }
      }`,
    variables: {
      identifier,
      address: sourceAddress,
      viaAddress,
      network,
      amount: amountDrops + "",
      fulfillmentTicket,
      condition,
      escrowId,
      sequenceNumber: parseInt(sequenceNumber, 10), // 32 bit
      cancelAfter: parseInt(cancelAfter, 10), // 32 bit
    },
    operationName,
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
      body: JSON.stringify(gqlMutation),
    };
    // console.log(fetchToCurl(`${identityResolver}/api/v1/gql`, options));
    results = await fetch(`${identityResolver}/api/v1/gql`, options).then(
      async (r) => {
        // check status code
        if (r.status !== 200) {
          log(`\nError submitting did lookup: ${r.status} ${r.statusText}\n`);
          const json = await r.json(); // not guaranteed to be json :(
          if (json) {
            const d = json.data;
            const errMsg = d.escrowNotify?.status?.message || "";
            throw new Error(errMsg);
          }
          throw new Error("Error in escrow notify");
        }

        const out = await r.json();
        // console.log("out", JSON.stringify(out, null, 2));
        // {
        //     "data": {
        //       "escrowNotify": {
        //         "status": {
        //           "code": 400,
        //           "message": "unknown address"
        //         }
        //       }
        //     }
        //   }

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
  // console.log("results", results);
  const status = results.data.escrowNotify.status.code === 200 ? "ok" : "error";
  if (status === "error") {
    throw new Error(results.data.escrowNotify.status.message + " error");
  }
  return status;
};
