import { disconnect, getDirectoryDataFromMemos } from '$lib/xrpl.js';

import { BloomFilter } from 'bloomfilter';
import { getIngressAddresses } from '$lib/configured.js';
// import { getKycStatus } from '$lib/kyc.js';
// import { getPayViaForNetwork } from '$lib/utils/escrow.js';
import log from '@kudos-protocol/logging';
import { redis } from '$lib/redis.js';
import { verifyQueueRequest } from '$lib/queue.js';

const onPaymentCreate = async ({ request }) => {
	let params;
	try {
		params = await verifyQueueRequest({ request });
	} catch (e) {
		return new Response(JSON.stringify({ status: { message: e.message, code: 401 } }), {
			status: 401
		});
	}

	const { tx } = params;
	const { Destination, Account, Amount, Memos, Sequence, TransactionType } = tx;
	// const txId = `${tx.hash}`;

	// get the eligible network from the params
	const qp = new URL(request.url).searchParams;
	const NETWORK = qp.get('network').replace(/-/g, ':'); // ?network=xrpl-testnet

	if (!NETWORK) {
		return new Response(JSON.stringify({ status: { message: 'missing network', code: 400 } }), {
			status: 400
		});
	}

	log.debug('onPayment', {
		Destination, // our account
		Creator: Account, // sender of the money
		Amount, // should be >= 10000000
		Memos,
		Sequence,
		TransactionType
	});

	if (TransactionType !== 'Payment') {
		log.info('invalid transaction type', TransactionType);
		return new Response(
			JSON.stringify({ status: { message: 'invalid transaction type', code: 400 } }),
			{
				status: 400
			}
		);
	}

	// see how we're configured
	const addresses = getIngressAddresses(NETWORK);

	if (!addresses.has(Destination)) {
		// not configured to accept this address
		log.info('not configured to accept this address', { Destination });
		return new Response(JSON.stringify({ status: { message: 'invalid address', code: 401 } }), {
			status: 401 // will be retried
		});
	}

	// get the identifier from the Memo
	// const identifier = Memos[0].Memo.MemoData;
	// Memos: [
	// 	{
	// 	  "Memo": {
	// 		"MemoData": "6469643A6B75646F733A656D61696C3A6D6174742B323063406C6F72656D6C6162732E636F6D",
	// 		"MemoFormat": "746578742F706C61696E",
	// 		"MemoType": "72656C6179746F2E6964656E746966696572"
	// 	  }
	// 	}
	//   ]

	if (!Memos || !Memos[0] || !Memos[0].Memo || !Memos[0].Memo.MemoData) {
		log.info('invalid memo', { Memos });
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	let matchedMemo = {
		identifier: '',
		viaAddress: '',
		signature: ''
	};
	try {
		matchedMemo = getDirectoryDataFromMemos({ memos: Memos });
	} catch (e) {
		log.info('invalid memo err', { Memos, e: e.message });
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	let { identifier } = matchedMemo;
	const { viaAddress } = matchedMemo;

	if (!identifier) {
		log.info('identifier not found in Memo');
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	identifier = identifier.toLowerCase().trim();

	// make sure it's not too big of input
	// if (identifier.length > 2000) {
	// 	throw new Error('Identifier too long');
	// }
	// if (params.value.length > 2000) {
	// 	throw new Error('Payment method value too long');
	// }

	// let's set it TODO: check if it exists
	await redis.hset(`u:${identifier}`, { payVia: [NETWORK, viaAddress] });

	// fetch current bloom filter from redis
	let bloomFilterData = await redis.get('bloom:payVia');
	let bloom;
	if (!bloomFilterData) {
		bloom = new BloomFilter(
			32 * 256 * 4, // number of bits to allocate (32 * 256 * 4 = 32768)
			16 // 16 hash functions
		);
	} else {
		bloom = new BloomFilter(JSON.parse(bloomFilterData), 16);
	}

	// add the identifier to the bloom filter
	bloom.add(identifier);

	bloomFilterData = JSON.stringify(JSON.stringify([].slice.call(bloom.buckets))); // the redis library automatically jsons, so we do it twice
	// log.debug('bloomFilterData', bloomFilterData);
	// save the bloom filter back to redis (TODO: should lock this transaction)
	await redis.set('bloom:payVia', bloomFilterData);

	try {
		await disconnect(NETWORK); // so the process hangs up
	} catch (e) {
		log.error('disconnect error', e);
	}

	// TODO: add to queue so we send email to notify success / receipt of payment

	// return a response object
	return new Response(JSON.stringify({ status: { message: 'ok', code: 200 } }), {
		status: 200
		// headers: {
		// }
	});
};

const cors = async () => {
	return new Response('', {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '600',

			'Cache-Control': 'max-age=60'
		}
	});
};

export { onPaymentCreate as POST, cors as OPTIONS };
