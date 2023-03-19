import { Receiver as Qstash } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import { getEscrowDataFromMemos } from '$lib/xrpl.js';
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

const onEscrowCreate = async ({ request }) => {
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
		return new Response(JSON.stringify({ status: { message: 'invalid request', code: 400 } }), {
			status: 400
		});
	}

	// parse the body
	const params = JSON.parse(body); // error on fail
	const { tx } = params;
	const { Destination, Amount, CancelAfter, Memos, Sequence, TransactionType } = tx;

	if (TransactionType !== 'EscrowCreate') {
		return new Response(
			JSON.stringify({ status: { message: 'invalid transaction type', code: 400 } }),
			{
				status: 400
			}
		);
	}

	// see how we're configured
	const addresses = getIngressAddresses(network);

	if (!addresses.has(Destination)) {
		// not configured to accept this address
		// log.warn('not configured to accept this address', address, network, addresses);
		return new Response(JSON.stringify({ status: { message: 'invalid address', code: 401 } }), {
			status: 401 // will be retried
		});
	}

	// get the identifier from the Memo
	// const identifier = Memos[0].Memo.MemoData;
	if (!Memos || !Memos[0] || !Memos[0].Memo || !Memos[0].Memo.MemoData) {
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

	const { identifier } = getEscrowDataFromMemos(Memos);

	if (!identifier) {
		return new Response(JSON.stringify({ status: { message: 'invalid memo', code: 400 } }), {
			status: 400
		});
	}

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
