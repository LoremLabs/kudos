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
      rate = {
        rate: data.price,
        ts,
      };
      conversionRate['xrp-usd'] = { ...rate };
    } else {
      throw new Error('Invalid conversion data');
    }
  }

  // convert the xrp to usd
  const usd = xrp * rate.rate;
  console.log({ xrp, rate: rate.rate, usd });
  return { usd, xrp, rate: rate.rate };
};

export const clients = {};

export const DEFAULT_SERVERS = {
  'xrpl:livenet': 'wss://xrplcluster.com',
  'xrpl:testnet': 'wss://testnet.xrpl-labs.com',
  'xrpl:devnet': 'wss://s.devnet.rippletest.net',
};

export const getClient = async (clientType, address, endpoint) => {
  const clientKey = `${clientType}:${address}`;

  // if we don't have a client, create one
  if (!clients[clientKey]) {
    clients[clientKey] = {};
  }

  let client = clients[clientKey].client;
  const server = endpoint || DEFAULT_SERVERS[clientType];

  // if we don't have a client, create one
  if (!client) {
    // const wallet = xrpl.Wallet.fromSeed(seed);

    if (!xrpl) {
      xrpl = await import('xrpl');
    }

    client = new xrpl.Client(server);
    clients[clientKey].client = client;

    // listen for errors
    client.on('error', (err) => {
      console.log('client error', err);
      // if (err.message.toLowerCase().includes('disconnected') || err.message.toLowerCase().includes('reset')) {
      //   // try to reconnect
      //   console.log('reconnecting', clientType, address);
      //   client.connect();
    });

    await client.connect();
  }

  return client;
};

export const getWallet = async (clientType) => {
  // get the wallet from the store
  const keys = await getKeys(clientType);

  // create a wallet from public and private keys
  const wallet = new xrpl.Wallet(keys.publicKey, keys.privateKey);
  return { wallet, keys };
};

export const fundViaFaucet = async (clientType) => {
  // for dev or testnet, fund the account via the faucet
  if (clientType === 'xrpl:devnet' || clientType === 'xrpl:testnet') {
    const { wallet, keys } = await getWallet(clientType);
    const client = await getClient(clientType, keys.address);
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
    if (
      e.message.toLowerCase().includes('disconnected') ||
      e.message.toLowerCase().includes('reset')
    ) {
      // try to reconnect
      console.log('reconnecting', clientType, address);
      await client.connect();
      balance = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });
    } else if (e.message.toLowerCase().includes('not found')) {
      // return an empty balance
      return {
        asset: clientType,
        xrp: 0,
        xrpDrops: 0,
        usd: 0,
        address: address,
        message: 'Account not found',
      };
    } else if (e.message.toLowerCase().includes('connection failed')) {
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
      console.log('errr', e);
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
