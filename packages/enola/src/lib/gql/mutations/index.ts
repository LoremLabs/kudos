import { BloomFilter } from 'bloomfilter';
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

export const setPayVia = async (_, params) => {
	log.debug('---------------------', params);

	// TODO: more validation

	// make sure we have a valid identifier
	if (!params.identifier) {
		throw new Error('Invalid identifier');
	}

	// make sure we have a valid payment method
	if (!params.value) {
		throw new Error('Invalid payment method value');
	}

	// make sure we have a valid payment method
	if (!params.type) {
		throw new Error('Invalid payment method type');
	}

	let identifier = params.identifier.toLowerCase().trim();

	// make sure it's not too big of input
	if (identifier.length > 2000) {
		throw new Error('Identifier too long');
	}
	if (params.value.length > 2000) {
		throw new Error('Payment method value too long');
	}

	// let's set it TODO: check if it exists
	await redis.hset(`u:${identifier}`, { payVia: [params.type, params.value] });

	// fetch current bloom filter from redis
	let bloomFilterData = await redis.get('bloom:payVia');
	let bloom;
	if (!bloomFilterData) {
		bloom = new BloomFilter(
			32 * 256 * 4, // number of bits to allocate (32 * 256 * 4 = 32768)
			16 // 16 hash functions
		);
	} else {
		bloom = new BloomFilter(JSON.parse(bloomFilterData), 16);
	}

	// add the identifier to the bloom filter
	bloom.add(identifier);

	bloomFilterData = JSON.stringify(JSON.stringify([].slice.call(bloom.buckets))); // the redis library automatically jsons, so we do it twice
	// log.debug('bloomFilterData', bloomFilterData);
	// save the bloom filter back to redis (TODO: should lock this transaction)
	await redis.set('bloom:payVia', bloomFilterData);

	return {
		type: params.type,
		value: params.value
	};
};

export default {
	setPayVia
};
