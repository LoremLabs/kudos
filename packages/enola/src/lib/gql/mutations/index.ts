import { BloomFilter } from 'bloomfilter';
import { Redis } from '@upstash/redis';
import log from '$lib/logging';
import { utils } from 'ethers'; // TODO: must be a better way, also this is pegged to v5

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

export const submitKudosForFame = async (_, params) => {
	//	log.debug('---------------------', params);

	// check the payload for requirements
	if (!params.signature || !params.address) {
		log.warn('missing signature or address', params);
		return {
			status: 'missing signature or address',
			statusCode: 400
		};
	}

	// check the payload for a valid signature / address
	try {
		const signerAddress = await utils.verifyMessage(params.payload, params.signature);
		const valid = signerAddress === params.address;
		if (!valid) {
			return {
				status: 'invalid signatures',
				statusCode: 400
			};
		}
	} catch (e) {
		log.error('invalid signature', e);
		return {
			status: 'invalid signature',
			statusCode: 400
		};
	}

	// if we're here, then the signature is valid, so let's parse the payload: base64 to utf8string to json.parse -> object
	const dataRaw = Buffer.from(params.payload, 'base64');
	const data = utils.toUtf8String(dataRaw);
	// log.debug('data', data);
	log.debug('----------------------');
	// now foreach kudos item, decode, check the signature
	//log.debug('kudos', data.kudos);
	try {
		// loop through data.kudos array
		const d = JSON.parse(data);
		log.debug('d', d);
		await Promise.all(
			d.kudos.map(async (k) => {
				log.debug(`kudos1a`, { k });
				const signerAddress = await utils.verifyMessage(k.message, k.signature);
				log.debug('signerAddress', signerAddress);
				if (signerAddress !== params.address) {
					throw new Error('invalid signature');
				}
				// convert the message into data
				const kudosData = JSON.parse(Buffer.from(k.message, 'base64').toString('utf8'));
				log.debug('kudosData', kudosData);

				// check to see if weight is between 0 and 1
				if (kudosData.weight < 0 || kudosData.weight > 1) {
					throw new Error('invalid weight');
				}
			})
		);
	} catch (e) {
		if (e.message === 'invalid signature') {
			log.error('invalid signature', e);
			return {
				status: 'invalid signature',
				statusCode: 400
			};
		} else {
			log.error('invalid payload', e);
			return {
				status: 'invalid payload',
				statusCode: 400
			};
		}
	}

	return {
		status: 'success',
		statusCode: 200
	};
};

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

	const identifier = params.identifier.toLowerCase().trim();

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
	setPayVia,
	submitKudosForFame
};
