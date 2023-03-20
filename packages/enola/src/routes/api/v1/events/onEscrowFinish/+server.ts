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

// onEscrowFinish fires from a ledger event
const onEscrowFinish = async ({ request }) => {
	const startTs = Date.now();

	let params;
	try {
		params = await verifyQueueRequest({ request });
	} catch (e) {
		return new Response(JSON.stringify({ status: { message: e.message, code: 401 } }), {
			status: 401
		});
	}

	log.info('onEscrowFinish', params);

	// return a response object
	return new Response(JSON.stringify({ status: { message: 'tktk', code: 500 } }), {
		status: 500
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

export { onEscrowFinish as POST, cors as OPTIONS };
