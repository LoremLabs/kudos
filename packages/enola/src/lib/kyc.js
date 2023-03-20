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
