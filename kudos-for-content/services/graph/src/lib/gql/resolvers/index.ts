import { Redis } from '@upstash/redis';
import casual from 'casual';
import log from '@kudos-protocol/logging';

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

export const payVia = async (_, params) => {
	const identifier = params.identifier.toLowerCase().trim();

	// make sure it's not too big of input
	if (identifier.length > 2000) {
		throw new Error('Identifier too long');
	}

	const data = await redis.hget(`u:${identifier}`, 'payVia');
	if (data) {
		//		const data = JSON.parse(payload);
		return [
			{
				type: data[0],
				value: data[1]
			}
		];
	} else {
		return [];
	}
};

// export const sayHello = async () => {
// 	const value = await redis.get('test');

// 	await redis.set('test', casual.name);

// 	return {
// 		name: value,
// 		age: casual.integer(10, 100)
// 	};
// };

export const resolveDid = () => {
	return {
		name: casual.name,
		age: casual.integer(10, 100)
	};
};

export default {
	payVia,
	resolveDid
};
