import { fulfillEscrow, getEscrowDataFromMemos } from '$lib/xrpl.js';
import { getPayViaForNetwork, shortAddress } from '$lib/utils/escrow.js';

import { Redis } from '@upstash/redis';
import { getIngressAddresses } from '$lib/configured.js';
import { getKycStatus } from '$lib/kyc.js';
import log from '$lib/logging';
import { verifyQueueRequest } from '$lib/queue.js';

let redis = {};
try {
	redis = new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN
	});
} catch (e) {
	log.error('Redis connect error', e);
	process.exit(1);
}

const onEscrowCreate = async ({ request }) => {
	let params;
	try {
		params = await verifyQueueRequest({ request });
	} catch (e) {
		return new Response(JSON.stringify({ status: { message: e.message, code: 401 } }), {
			status: 401
		});
	}

	const { tx } = params;
	const { Destination, Amount, CancelAfter, Memos, Sequence, TransactionType } = tx;

	// get the eligible network from the params
	const qp = new URL(request.url).searchParams;
	const NETWORK = qp.get('network'); // ?network=xrpl-testnet
	if (!NETWORK) {
		return new Response(JSON.stringify({ status: { message: 'missing network', code: 400 } }), {
			status: 400
		});
	}

	log.debug('onEscrowCreate', {
		Destination,
		Amount,
		CancelAfter,
		Memos,
		Sequence,
		TransactionType
	});

	if (TransactionType !== 'EscrowCreate') {
		log.warn('invalid transaction type', TransactionType);
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
		log.warn('not configured to accept this address', { Destination });
		return new Response(JSON.stringify({ status: { message: 'invalid address', code: 401 } }), {
			status: 401 // will be retried
		});
	}

	// get the identifier from the Memo
	// const identifier = Memos[0].Memo.MemoData;
	if (!Memos || !Memos[0] || !Memos[0].Memo || !Memos[0].Memo.MemoData) {
		log.warn('invalid memo', { Memos });
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	let matchedMemo = {
		identifier: ''
	};
	try {
		matchedMemo = getEscrowDataFromMemos({ memos: Memos });
	} catch (e) {
		log.warn('invalid memo', { Memos });
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	const { identifier } = matchedMemo;

	if (!identifier) {
		log.warn('identifier not found in Memo');
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	// see if this is a Known Escrow
	const knownEscrowData = await redis.get(
		`escrow:${shortAddress(Destination)}:${Sequence}:${identifier}`
	);
	if (!knownEscrowData) {
		// we don't know about this escrow (yet?)
		log.warn('unknown escrow', {
			Destination,
			Amount,
			CancelAfter,
			Memos,
			Sequence,
			TransactionType
		});
		return new Response(JSON.stringify({ status: { message: 'unknown escrow', code: 503 } }), {
			status: 503
		});
	}

	// we know about this escrow, but is it the right one?
	// does the internal address match?
	if (knownEscrowData.address !== Destination) {
		log.warn('escrow address mismatch', { address: knownEscrowData.address, Destination });
		return new Response(
			JSON.stringify({ status: { message: 'escrow address mismatch', code: 500 } }),
			{
				status: 500
			}
		);
	}

	// see if the network matches
	if (knownEscrowData.network !== NETWORK) {
		log.warn('escrow network mismatch', { network: knownEscrowData.network, NETWORK });
		return new Response(
			JSON.stringify({ status: { message: 'escrow network mismatch', code: 500 } }),
			{
				status: 500
			}
		);
	}

	// see the status of the escrow is still pending (exists in the set)
	const pending = await redis.zscore(`pending:${identifier}`, `${Destination}:${Sequence}`);
	if (!pending || pending <= 0) {
		log.warn('escrow already processed?', { Sequence, Destination });
		return new Response(
			JSON.stringify({ status: { message: 'escrow already processed', code: 500 } }),
			{
				status: 500
			}
		);
	}

	// see if we have a PayVia address for this identifier
	const payViaData = await redis.hget(`u:${identifier}`, 'payVia');
	const bestPayVia = getPayViaForNetwork(payViaData, NETWORK); // return the best address for this network
	if (!bestPayVia) {
		log.warn('no payVia address found', { identifier });

		// no payVia address found, so we can't fulfill this escrow now, but we'll treat it as queued
		// as it's in the `pending` set for this identifier
		return new Response(JSON.stringify({ status: { message: 'queued', code: 202 } }), {
			status: 202
		});
	}

	// check if this address is KYC compliant
	const kycStatus = await getKycStatus({ network: NETWORK, address: bestPayVia, identifier });
	if (!kycStatus || kycStatus !== 'pass') {
		log.warn('payVia address not KYC compliant', { bestPayVia });
		return new Response(
			JSON.stringify({ status: { message: 'payVia address not KYC compliant', code: 403 } }),
			{
				status: 403
			}
		);
	}

	// if we're here then we have an address that we can pay via
	// and we have an escrow that we can pay
	// so let's fulfill the escrow

	// TODO: fulfill the escrow here, mark it fulfilled in the set
	const fulfillStatus = await fulfillEscrow({
		network: NETWORK,
		address: Destination,
		sequence: Sequence,
		fulfillment: knownEscrowData.fulfillment
	});
	log.debug('fulfillEscrow', fulfillStatus);

	// if we've fulfilled the escrow, we'll set the timestamp to negative to note that it's been fulfilled, but still in process
	// once another process has completed the payment, it'll remove the escrow from the set
	await redis.zadd(`pending:${identifier}`, -1 * pending, `${Destination}:${Sequence}`); // updates score only

	// when that escrow is fulfilled, we'll send out the payment via that process
	// we're done here.

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

export { onEscrowCreate as POST, cors as OPTIONS };
