import { Redis } from '@upstash/redis';
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

export const getKycStatus = async function ({ address, network, identifier }) {
	// first see if the address is on the KYC deny list
	const denyIdent = await redis.sismember(`kyc:deny`, `i:${identifier}`); // across all networks
	const denyAddress = await redis.sismember(`kyc:deny`, `a:${address}`); // across all networks
	if (denyIdent || denyAddress) {
		log.info('getKycStatus denied', { denyIdent, denyAddress });
		return 'fail';
	}

	switch (network) {
		case 'xrpl:testnet': {
			log.info('getKycStatus testnet pass');
			return 'pass'; // always pass for testnet
		}
		case 'xrpl:livenet': {
			const key = `u:${identifier}`;
			const value = await redis.hget(key, 'kycOk'); // data stored elsewhere
			if (value) {
				log.info('getKycStatus pass');
				return 'pass';
			}
			log.info('getKycStatus FAIL');
			return 'fail';
		}
		default: {
			log.info('getKycStatus FAIL');
			return 'fail';
		}
	}
};

export const logAuthAction = async function ({ address, method, identifier, data, ts }) {
	// identifier: did:kudos:email:alice@example.com
	// method: email, twitter, phone, etc
	// data: { msg: 'user authenticated' }

	// we store a log of all auth actions on an identifier

	const ident = identifier.toLowerCase().trim();
	if (!ident) {
		throw new Error('logAuthAction: no identifier');
	}

	// log should be append-only list of actions taken for this identifier
	const cacheKey = `auth:log:${ident}`;
	const cacheValue = {
		address,
		method,
		data,
		ts
	};
	// cacheKey is a list
	await redis.lpush(cacheKey, cacheValue);

	// log keyed on address
	const cacheKey2 = `address:log:${address}`;
	const cacheValue2 = {
		ident,
		method,
		data,
		ts
	};
	// cacheKey is a list
	await redis.lpush(cacheKey2, cacheValue2);

	// add did to list of ids associated with address
	// score = date last verified, can be used to expire old entries
	const addressKey = `address:dids:${address}`;
	await redis.zadd(addressKey, { score: Date.now(), member: ident });
};
