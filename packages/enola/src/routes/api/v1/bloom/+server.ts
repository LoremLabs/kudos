import { Redis } from '@upstash/redis';
import { createHmac } from 'node:crypto';
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

const payVia = async (_, params, req) => {
	let bloomFilterData = await redis.get('bloom:payVia');

	const etag = createHmac('sha256', 'etag').update(bloomFilterData).digest('base64');

	// return a response object
	return new Response(bloomFilterData, {
		status: 200,
		headers: {
			'content-type': 'application/json',
			etag: etag,

			// set a 30 second cache
			'cache-control': 'max-age=30; public'
		}
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

export { payVia as GET, cors as OPTIONS };
