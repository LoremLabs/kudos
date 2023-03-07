// import xrpl from 'xrpl';

// export type Balance = {
//   asset: string;
//   xrp: string;
//   usd: string;
//   address: string;
// };

import { getKeys, walletStore } from '$lib/stores/wallet';

import { fetch as tauriFetch } from '@tauri-apps/api/http';

const CONVERSION_API =
  'https://www.binance.com/api/v3/ticker/price?symbol=XRPUSDT';
const CONVERSION_CACHE_MS = 1000 * 60 * 5; // 5 minutes

let xrpl;
let conversionRate = {};

export const convertXrpToUsd = async (xrp, noCache) => {
  // get the conversion rate
  let rate = conversionRate['xrp-usd'];

  const ts = Date.now();
  if (!rate || noCache || ts - rate?.ts > CONVERSION_CACHE_MS) {
    const response = await tauriFetch(CONVERSION_API, {
      method: 'GET',
      timeout: 30,
    });
    const data = await response.data;
    if (data.price) {
      rate = data.price;
      conversionRate['xrp-usd'] = {
        rate,
        ts,
      };
    } else {
      throw new Error('Invalid conversion data');
    }
  }

  // convert the xrp to usd
  const usd = xrp * rate;
  return { usd, xrp, rate };
};

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

export const getClient = async (clientType) => {
  let client = clients[clientType].client;
  const server = clients[clientType].server;

  // if we don't have a client, create one
  if (!client) {
    // const wallet = xrpl.Wallet.fromSeed(seed);

    if (!xrpl) {
      xrpl = await import('xrpl');
    }

    client = new xrpl.Client(server);
    clients[clientType].client = client;
    await client.connect();
  }

  return client;
};

export const getWallet = async (clientType) => {
  // get the wallet from the store
  const keys = await getKeys(clientType);

  // create a wallet from public and private keys
  const wallet = new xrpl.Wallet(keys.publicKey, keys.privateKey);
  return wallet;
};

export const fundViaFaucet = async (clientType) => {
  // for dev or testnet, fund the account via the faucet
  if (clientType === 'xrpl:devnet' || clientType === 'xrpl:testnet') {
    const client = await getClient(clientType);
    const wallet = await getWallet(clientType);
    // const address = wallet.getAddress();
    // console.log({address});
    // console.log({wallet});
    const { balance } = await client.fundWallet(wallet);
    // console.log({balance});
    return balance;
    // const response = await tauriFetch(
    //   'https://faucet.altnet.rippletest.net/accounts',
    //   {
    //     method: 'POST',
    //     body: JSON.stringify({
    //       destination: address,
    //     }),
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     timeout: 30,
    //   }
    // );
  } else {
    throw new Error('Cannot fund account on requested network');
  }
};

export const getBalancesXrpl = async (clientType, params) => {
  // foreach client type, make sure we're connected and get the balance

  let client = await getClient(clientType);

  // get the address
  const address = params.address;
  if (!address) {
    throw new Error('No address provided for ' + clientType);
  }

  //   // get the balance
  let balance;
  try {
    balance = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });
  } catch (e) {
    if (e.message.includes('disconnected')) {
      // try to reconnect
      await client.connect();
      balance = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });
    } else if (e.message.includes('not found')) {
      // return an empty balance
      return {
        asset: clientType,
        xrp: 0,
        xrpDrops: 0,
        usd: 0,
        address: address,
        message: 'Account not found',
      };
    } else {
      // throw e;
      return {
        asset: clientType,
        xrp: 0,
        xrpDrops: 0,
        usd: 0,
        address: address,
        message: e.message,
      };
    }
  }

  console.log({ balance, clientType });

  // convert the xrp to usd
  const { usd } = await convertXrpToUsd(
    xrpl.dropsToXrp(balance.result.account_data.Balance)
  );

  // return the balance
  return {
    asset: clientType,
    xrp: xrpl.dropsToXrp(balance.result.account_data.Balance),
    xrpDrops: balance.result.account_data.Balance,
    usd,
    address: address,
    message: '',
  };
};
