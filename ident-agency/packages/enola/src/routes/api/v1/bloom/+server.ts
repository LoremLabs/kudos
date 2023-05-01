import { createHmac } from 'node:crypto';
// import log from '@kudos-protocol/logging';
import { redis } from '$lib/redis.js';

const payVia = async () => {
	const bloomFilterData = await redis.get('bloom:payVia');

	const etag = createHmac('sha256', 'etag').update(bloomFilterData).digest('base64');

	// return a response object
	return new Response(bloomFilterData, {
		status: 200,
		headers: {
			'access-control-allow-origin': '*',
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
