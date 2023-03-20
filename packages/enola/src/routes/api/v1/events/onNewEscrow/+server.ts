import { Redis } from '@upstash/redis';
import { getIngressAddresses } from '$lib/configured.js';
import log from '$lib/logging';
import { shortAddress } from '$lib/utils/escrow.js';
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

// onNewEscrow fires from the fulfillment creation process, not from ledger events
const onNewEscrow = async ({ request }) => {
	const startTs = Date.now();

	let params;
	try {
		params = await verifyQueueRequest({ request });
	} catch (e) {
		return new Response(JSON.stringify({ status: { message: e.message, code: 401 } }), {
			status: 401
		});
	}

	const { network, viaAddress, identifier, sequenceNumber } = params;

	// see how we're configured
	const addresses = getIngressAddresses(network);

	if (!addresses.has(viaAddress)) {
		// not configured to accept this address
		log.warn('not configured to accept this address', viaAddress, network, addresses);
		return new Response(JSON.stringify({ status: { message: 'invalid address', code: 403 } }), {
			status: 403 // will be retried
		});
	}

	// add this as a "Known Escrow" : set `ident:$address:$sequenceNumber:$identifier` = ...params
	await redis.set(
		`escrow:${shortAddress(viaAddress)}:${sequenceNumber}:${identifier}`,
		{
			...params // includes network
		},
		{
			nx: true // only set if not exists. we ignore this error
		}
	);
	// TODO: log error if set

	// add to `pending:$identifier` = $address:$sequenceNumber
	await redis.zadd(`pending:${identifier}`, {
		member: `${viaAddress}:${sequenceNumber}`, // full address TODO: do we need to add `address` in for who sent it?
		score: Date.now(),
		nx: true
	}); // nb: not ripple time

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

export { onNewEscrow as POST, cors as OPTIONS };
