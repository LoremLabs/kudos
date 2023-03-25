import log from './logging';
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
		log.debug(`getClient [${network}] endpoint: ${endpoint}`);
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
			log.debug(`client [${network}] error`, err.message);
		});

		client.on('connected', () => {
			log.debug(`client [${network}] connected`);
		});

		await client.connect();
		return client;
	} else {
		await client.connect();
		return client;
	}
};

export const getKeys = async function (address) {
	// TODO: get seed from vault directly
	const keyString = process.env[`WALLET_SEED_${address.toUpperCase()}`] || '';
	if (!keyString) {
		throw new Error(`Wallet seed not found for address: ${address}`);
	}

	const [publicKey, privateKey] = keyString.split(':');

	return { publicKey, privateKey };
};

export const getWallet = async function (address) {
	let wallet = wallets[address];
	if (!wallet) {
		const walletKeys = await getKeys(address);
		wallet = new xrpl.Wallet(walletKeys.publicKey, walletKeys.privateKey, {
			masterAddress: address
		});
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

export const fulfillEscrow = async function ({
	network,
	address, // wallet address
	owner, // escrow owner (Creator)
	sequence,
	fulfillment,
	condition,
	escrowId
}) {
	const client = await getClient(network);
	const wallet = await getWallet(address);

	log.debug('Fulfillment:', fulfillment);

	const Fee = (330 + 10 * Math.ceil(Buffer.byteLength(fulfillment) / 16)).toString();
	log.debug('Fee:', Fee);

	// add our escrowId to the Memo
	const memos = [
		{
			Memo: {
				MemoType: xrpl.convertStringToHex('relayto.id'),
				MemoData: xrpl.convertStringToHex(escrowId),
				MemoFormat: xrpl.convertStringToHex('text/plain')
			}
		}
	];

	const tx = {
		TransactionType: 'EscrowFinish',
		Account: address,
		Owner: owner,
		Memos: memos,
		OfferSequence: Number(sequence),
		Condition: condition,
		Fulfillment: fulfillment,
		Fee
	};

	// const prepared = await client.autofill(tx);
	// const signed = wallet.sign(prepared);

	// log.debug("Identifying hash:", signed.hash);
	// log.debug("Signed blob:", signed.tx_blob);

	const result = await client.submitAndWait(tx, { wallet });
	log.debug('Result:', result);
	return result;
};

export const currentLedger = async function (network) {
	const client = await getClient(network);
	const info = await client.request({ command: 'ledger' });
	return info.ledger_index;
};

export const disconnect = async function (network) {
	const client = clients[network];
	if (!client) {
		return;
	}
	await client.disconnect();
	delete clients[network];
};

export const getMemoData = function ({ memos, memoType, memoFormat }) {
	if (!memos) {
		throw new Error('No memos found');
	}

	// go through the memos in order, looking for the relayto.identifier
	let found;
	memos.forEach((memo) => {
		if (xrpl.convertHexToString(memo.Memo.MemoType) === memoType) {
			const data = xrpl.convertHexToString(memo.Memo.MemoData);

			// // MemoFormat values: # MemoFormat values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
			const format = xrpl.convertHexToString(memo.Memo.MemoFormat);
			if (format === memoFormat) {
				found = data;
				return data; // NB: returns first match, could there be multiple?
			}
		}
	});
	if (!found) {
		throw new Error(`${memoType} not found in memos`);
	}

	return found;
};

export const getEscrowDataFromMemos = function ({ memos }) {
	let matchedMemo = {
		identifier: getMemoData({ memos, memoType: 'relayto.identifier', memoFormat: 'text/plain' })
	};

	return matchedMemo;
};

export const getEscrowIdFromMemos = function ({ memos }) {
	let matchedMemo = {
		escrowId: getMemoData({ memos, memoType: 'relayto.id', memoFormat: 'text/plain' })
	};
	return matchedMemo;
};

export const sendEscrowedPayment = async function ({
	network,
	address, // wallet address
	destination, // destination address
	amount, // amount to send in drops
	escrowId,
	identifier
}) {
	const client = await getClient(network);
	const wallet = await getWallet(address);

	// add our escrowId to the Memo
	const memos = [
		{
			Memo: {
				MemoType: xrpl.convertStringToHex('relayto.id').toUpperCase(),
				MemoData: xrpl.convertStringToHex(escrowId).toUpperCase(),
				MemoFormat: xrpl.convertStringToHex('text/plain').toUpperCase()
			}
		},
		{
			Memo: {
				MemoType: xrpl.convertStringToHex('relayto.identifier').toUpperCase(),
				MemoData: xrpl.convertStringToHex(identifier).toUpperCase(),
				MemoFormat: xrpl.convertStringToHex('text/plain').toUpperCase()
			}
		}
	];

	const tx = {
		TransactionType: 'Payment',
		Account: address,
		Destination: destination,
		Amount: amount,
		Memos: memos
	};

	const prepared = await client.autofill(tx);
	const signed = wallet.sign(prepared);

	// TODO: maybe? check if fee is greater than amount sent
	// const fee = Number(signed.tx_json.Fee);
	// const amountSent = Number(signed.tx_json.Amount);
	// if (fee > amountSent) {
	//     throw new Error(`Fee is greater than amount sent: ${fee} > ${amountSent}`);
	// }

	let result;
	try {
		result = await client.submitAndWait(signed.tx_blob);
	} catch (err) {
		log.info('Error:', err, err.message);
		throw err;
	}
	// console.log("send result", result);
	log.info('send result', result);
	return result;
};
