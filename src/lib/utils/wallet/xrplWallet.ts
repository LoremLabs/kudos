import xrpl from 'xrpl';

// export type Balance = {
//   asset: string;
//   xrp: string;
//   usd: string;
//   address: string;
// };

export const clients = {
  'xrpl:livenet': {
    server: 'wss://xrplcluster.com',
  },
  'xrpl:testnet': {
    server: 'wss://testnet.xrpl-labs.com',
  },
  'xrpl:devnet': {
    server: 'wss://s.devnet.rippletest.net',
  },
};

export const getBalancesXrpl = async (
  clientType,
  params
) => {
  // foreach client type, make sure we're connected and get the balance

console.log('getBalancesXrpl', clientType, params);
  let client = clients[clientType].client;
  const server = clients[clientType].server;

  // get the address
  const address = params.address;
  if (!address) {
    throw new Error('No address provided for ' + clientType);
  }

  // if we don't have a client, create one
  if (!client) {
    // const wallet = xrpl.Wallet.fromSeed(seed);
console.log('getBalancesXrpl2', clientType, client, clients[clientType], server);
    //const client2 = new xrpl.Client(server);
    // clients[clientType].client = client;
    // await client.connect();
  }
  return {};

//   // get the balance
//   const balance = await client.request({
//     command: 'account_info',
//     account: address,
//     ledger_index: 'validated',
//   });

//   // return the balance
//   return {
//     asset: clientType,
//     xrp: balance.result.account_data.Balance,
//     usd: '0',
//     address: address,
//   };
};
