import { disconnect, fulfillEscrow, getEscrowDataFromMemos } from '$lib/xrpl.js';

import { Redis } from '@upstash/redis';
import { getIngressAddresses } from '$lib/configured.js';
import { getKycStatus } from '$lib/kyc.js';
import { getPayViaForNetwork } from '$lib/utils/escrow.js';
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
	const { Destination, Account, Amount, CancelAfter, Memos, Sequence, Condition, TransactionType } =
		tx;

	// get the eligible network from the params
	const qp = new URL(request.url).searchParams;
	const NETWORK = qp.get('network').replace(/-/g, ':'); // ?network=xrpl-testnet

	if (!NETWORK) {
		return new Response(JSON.stringify({ status: { message: 'missing network', code: 400 } }), {
			status: 400
		});
	}

	log.debug('onEscrowCreate', {
		Destination, // place the money goes
		Owner: Account, // owner of the escrow
		Amount,
		CancelAfter,
		Memos,
		Sequence,
		Condition,
		TransactionType
	});

	if (TransactionType !== 'EscrowCreate') {
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
	if (!Memos || !Memos[0] || !Memos[0].Memo || !Memos[0].Memo.MemoData) {
		log.info('invalid memo', { Memos });
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
		log.info('invalid memo', { Memos });
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	const { identifier } = matchedMemo;

	if (!identifier) {
		log.info('identifier not found in Memo');
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	// see if this is a Known Escrow
	const escrowKey = `escrow:${Destination}:${Sequence}:${Account}`; // Account = Owner, Destination = ViaAddress

	const knownEscrowData = await redis.get(escrowKey);
	if (!knownEscrowData) {
		// we don't know about this escrow (yet?)
		log.info(`unknown escrow: ${escrowKey}`, {
			Destination,
			Account,
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
	if (knownEscrowData.viaAddress !== Destination) {
		log.info('escrow address mismatch', { viaAddress: knownEscrowData.viaAddress, Destination });
		return new Response(
			JSON.stringify({ status: { message: 'escrow address mismatch', code: 500 } }),
			{
				status: 500
			}
		);
	}

	// see if the network matches
	if (knownEscrowData.network !== NETWORK) {
		log.info('escrow network mismatch', { network: knownEscrowData.network, NETWORK });
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
		log.info('escrow already processed?', { Sequence, Destination });
		return new Response(
			JSON.stringify({ status: { message: 'escrow already processed', code: 500 } }),
			{
				status: 500
			}
		);
	}

	// see if we have a PayVia address for this identifier
	const payViaData = (await redis.hget(`u:${identifier}`, 'payVia')) || [];
	const bestPayVia = getPayViaForNetwork(payViaData, NETWORK); // return the best address for this network
	if (!bestPayVia) {
		log.info('no payVia address found', { identifier });

		// no payVia address found, so we can't fulfill this escrow now, but we'll treat it as queued
		// as it's in the `pending` set for this identifier
		return new Response(JSON.stringify({ status: { message: 'queued', code: 202 } }), {
			status: 202
		});
	}

	// check if this address is KYC compliant
	const kycStatus = await getKycStatus({ network: NETWORK, address: bestPayVia, identifier });
	if (!kycStatus || kycStatus !== 'pass') {
		log.info('payVia address not KYC compliant', { bestPayVia });
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

	let fulfillStatus;
	try {
		const fulfillParams = {
			network: NETWORK,
			address: knownEscrowData.viaAddress,
			owner: knownEscrowData.address,
			sequence: Sequence,
			fulfillment: knownEscrowData.fulfillmentTicket,
			condition: Condition
		};
		log.debug('fulfillEscrowParams', fulfillParams);
		fulfillStatus = await fulfillEscrow(fulfillParams);
		log.debug('fulfillEscrowStatus', fulfillStatus);
	} catch (e) {
		log.error('fulfillEscrowStatus', e);
		return new Response(JSON.stringify({ status: { message: 'fulfillEscrow error', code: 500 } }), {
			status: 500
		});
	}
	try {
	await disconnect(NETWORK); // so the process hangs up
	} catch (e) {
		log.error('disconnect error', e);
	}
	
	// see if the escrow was fulfilled
	if (!fulfillStatus || !fulfillStatus.result || !fulfillStatus.result.validated) {
		log.info('escrow not fulfilled', { fulfillStatus });
		return new Response(
			JSON.stringify({ status: { message: 'escrow not fulfilled', code: 500 } }),
			{
				status: 500
			}
		);
	}
	const fullfillmentState = fulfillStatus.result.meta.TransactionResult;
	if (fullfillmentState.indexOf('SUCCESS') === -1) {
		log.info('escrow not fulfilled', { fullfillmentState });
		return new Response(
			JSON.stringify({ status: { message: 'escrow not fulfilled', code: 500 } }),
			{
				status: 500
			}
		);
	}

	// if we've fulfilled the escrow, we'll set the timestamp to negative to note that it's been fulfilled, but still in process
	// once another process has completed the payment, it'll remove the escrow from the set
	log.debug('fulfilled escrow', { Destination, Sequence, pending });
	await redis.zadd(`pending:${identifier}`, {
		score: -1 * pending,
		member: `${Destination}:${Sequence}`
	}); // updates score only

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
