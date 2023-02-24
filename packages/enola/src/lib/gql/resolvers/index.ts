import { Redis } from '@upstash/redis';
import casual from 'casual';
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

export const sayHello = async () => {
	const value = await redis.get('test');

	await redis.set('test', casual.name);

	return {
		name: value,
		age: casual.integer(10, 100)
	};
};

export const resolveDid = () => {
	return {
		name: casual.name,
		age: casual.integer(10, 100)
	};
};

export default {
	sayHello,
	resolveDid
};
