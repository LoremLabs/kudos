import { Redis } from '@upstash/redis';
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

	// return a response object

	return new Response(bloomFilterData, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',

			// set a 30 second cache
			'Cache-Control': 'max-age=30'
		}
	});
};

export { payVia as GET };
