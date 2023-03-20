import xrpl from 'xrpl';

const clients = {};
const wallets = {};

export const ENDPOINTS = {
	'xrpl:livenet': process.env.XRPL_LIVENET || 'wss://xrplcluster.com',
	'xrpl:testnet': process.env.XRPL_TESTNET || 'wss://testnet.xrpl-labs.com',
	'xrpl:devnet': process.env.XRPL_DEVNET || 'wss://s.devnet.rippletest.net'
};

export const getClient = async function (network) {
	let client = clients[network];
	if (!client) {
		const endpoint = ENDPOINTS[network];
		switch (network) {
			case 'xrpl:testnet':
				client = new xrpl.Client(endpoint);
				break;
			case 'xrpl:livenet':
				client = new xrpl.Client(endpoint);
				break;
			case 'xrpl:devnet':
				client = new xrpl.Client(endpoint);
				break;
			default:
				throw new Error('unknown network: ' + network);
		}
		clients[network] = client;

		// auto-connect
		client.on('error', (err) => {
			console.log(`client [${network}] error`, err.message);
		});

		// client.on('connected', () => {
		// });

		await client.connect();
		return client;
	} else {
		return client;
	}
};

export const getSeed = async function (address) {
	// TODO: get seed from vault directly
	return process.env[`WALLET_SEED_${address.toUpperCase()}`];
};

export const getWallet = async function (address) {
	let wallet = wallets[address];
	if (!wallet) {
		const addressSeed = await getSeed(address);
		wallet = xrpl.Wallet.fromSeed(`${addressSeed}`);
		if (wallet) {
			if (wallet.classicAddress !== address) {
				throw new Error(`Wallet address mismatch: ${wallet.classicAddress} !== ${address}`);
			} else {
				wallets[address] = wallet;
			}
		} else {
			throw new Error(`Wallet not found for address: ${address}`);
		}
	}
	return wallet;
};

export const fulfillEscrow = async function ({ network, address, sequence, fulfillment }) {
	const client = await getClient(network);
	const wallet = await getWallet(address);

	const tx = {
		TransactionType: 'EscrowFinish',
		Account: address,
		Owner: address,
		OfferSequence: sequence,
		Condition: fulfillment
	};

	const result = await client.submit(wallet, tx);
	return result;
};

export const getEscrowDataFromMemos = function ({ memos }) {
	if (!memos) {
		throw new Error('No memos found');
	}

	let matchedMemo = {
		identifier: ''
	};

	// go through the memos in order, looking for the relayto.identifier
	memos.forEach((memo) => {
		if (xrpl.convertHexToString(memo.Memo.MemoType) === 'relayto.identifier') {
			const identifier = xrpl.convertHexToString(memo.Memo.MemoData);

			// // MemoFormat values: # MemoFormat values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
			const format = xrpl.convertHexToString(memo.Memo.MemoFormat);
			if (format === 'text/plain') {
				matchedMemo = { identifier };
				return matchedMemo;
			} else {
				throw new Error(`Unsupported memo format: ${format}`);
			}
		}
	});

	if (!matchedMemo.identifier) {
		throw new Error('No identifier found in memos');
	}

	return matchedMemo;
};
