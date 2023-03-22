import { Redis } from '@upstash/redis';
import log from '$lib/logging';

let redisClient = {};
try {
	redisClient = new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL,
		token: process.env.UPSTASH_REDIS_REST_TOKEN
	});
} catch (e) {
	log.error('Redis connect error', e);
	process.exit(1);
}

export const redis = redisClient;
