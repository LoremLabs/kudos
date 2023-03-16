import { Receiver as Qstash } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import { getIngressAddresses } from '$lib/configured.js';
import log from '$lib/logging';

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

const qstash = new Qstash({
	currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
	nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
});

const onNewEscrow = async ({ request }) => {
	const startTs = Date.now();

	const body = await request.text(); // raw request body
	const isValid = await qstash.verify({
		/**
		 * The signature from the `Upstash-Signature` header.
		 *
		 * Please note that on some platforms (e.g. Vercel or Netlify) you might
		 * receive the header in lower case: `upstash-signature`
		 *
		 */
		signature: request.headers.get('upstash-signature'),

		/**
		 * The raw request body.
		 */
		body,

		/**
		 * Number of seconds to tolerate when checking `nbf` and `exp` claims, to deal with small clock differences among different servers
		 *
		 * @default 0
		 */
		clockTolerance: 2
	});

	if (!isValid) {
		return new Response(JSON.stringify({ status: { message: 'invalid request', code: 401 } }), {
			status: 401
		});
	}

	// parse the body
	const params = JSON.parse(body); // error on fail
	const { network, address, identifier, sequenceNumber } = params;

	// see how we're configured
	const addresses = getIngressAddresses(network);

	if (!addresses.has(address)) {
		// not configured to accept this address
		// log.warn('not configured to accept this address', address, network, addresses);
		return new Response(JSON.stringify({ status: { message: 'invalid address', code: 401 } }), {
			status: 401 // will be retried
		});
	}

	// add to redis hmset `ident:$address:$sequenceNumber` = ...params
	await redis.set(
		`ident:${address}:${sequenceNumber}`,
		{
			...params
		},
		{
			nx: true // only set if not exists. we ignore this
		}
	);
	// TODO: log error if set

	// add to `pending:$identifier` = $address:$sequenceNumber
	await redis.zadd(`pending:${identifier}`, {
		member: `${address}:${sequenceNumber}`,
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
