import { BloomFilter } from 'bloomfilter';
import { Redis } from '@upstash/redis';
import { currentCohort } from '$lib/utils/date';
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

	let signerAddress = '';
	type AddressState = {
		[key: string]: string;
	};
	let addressStateChange: AddressState = {}; // used for hmset

	// check the payload for a valid signature / address
	try {
		signerAddress = await utils.verifyMessage(params.payload, params.signature);
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

	// see if we have a subject. If not, we'll use the current cohort date
	let subject = params.subject;
	if (!subject) {
		subject = currentCohort();
	}
	// slugify cohort
	subject = subject.toLowerCase().replace(/[^a-z0-9]/g, ''); // in particular should not contain the delimiter :
	if (subject === '') {
		return {
			status: 'invalid subject',
			statusCode: 400
		};
	}
	log.debug({ subject });

	// if we're here, then the signature is valid, so let's parse the payload: base64 to utf8string to json.parse -> object
	// we need to validate the weight as well as
	// create a payload for the hmset: a map of kudos.id to a json.stringified array of [kudos.identifier, kudos.weight]
	// hmset: a.${subject}.kudos ${kudos.id} ${JSON.stringify([kudos.identifier, kudos.weight])}

	const dataRaw = Buffer.from(params.payload, 'base64');
	const data = utils.toUtf8String(dataRaw);
	// log.debug('data', data);
	log.debug('----------------------');
	// now foreach kudos item, decode, check the signature
	//log.debug('kudos', data.kudos);
	try {
		// loop through data.kudos array
		const d = JSON.parse(data);
		// log.debug('d', d);
		await Promise.all(
			d.kudos.map(async (k) => {
				// log.debug(`kudos1a`, { k });
				const signerAddress = await utils.verifyMessage(k.message, k.signature);
				// log.debug('signerAddress', signerAddress);
				if (signerAddress !== params.address) {
					throw new Error('invalid signature');
				}
				// convert the message into data
				const kudosData = JSON.parse(Buffer.from(k.message, 'base64').toString('utf8'));
				// log.debug('kudosData', kudosData);

				// check to see if weight is between 0 and 1
				if (kudosData.weight < 0 || kudosData.weight > 1) {
					throw new Error('invalid weight');
				}

				// setup our addressStateChange object
				addressStateChange[kudosData.id] = JSON.stringify([kudosData.identifier, kudosData.weight]);
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

	// input has been validated, so let's add it to redis
	try {
		const promises = [];
		promises.push(redis.sadd(`subjects`, `${subject}`));
		promises.push(redis.sadd(`a:${subject}`, `${signerAddress}`)); // a=address
		promises.push(redis.set(`kudos-added`, `${Date.now()}`)); // kudos-added is a timestamp of when the last kudos was added, used for cache busting
		const size = 100;
		// break transaction up into $size chunks, doing one hmset per chunk
		const chunks = Object.keys(addressStateChange).reduce((resultArray, item, index) => {
			const chunkIndex = Math.floor(index / size);
			if (!resultArray[chunkIndex]) {
				resultArray[chunkIndex] = []; // start a new chunk
			}
			resultArray[chunkIndex].push(item);
			return resultArray;
		}, []);

		chunks.forEach((chunk) => {
			const chunkData = {};
			chunk.forEach((key) => {
				chunkData[key] = addressStateChange[key];
			});
			promises.push(redis.hmset(`d:${subject}:${signerAddress}`, chunkData)); // d=data
		});

		await Promise.all(promises);
	} catch (e) {
		log.error('redis error', e);
		return {
			status: 'error',
			statusCode: 500
		};
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

// escrowNotify(
// 	address: String!
// 	identifier: String!
// 	network: String!
// 	expiresAt: Int
// 	amount: String!
// 	fulfillmentTicket: String!
// ): GenericResponse

export const escrowNotify = async (_, params) => {
	//	log.debug('---------------------', params);

	const {
		address,
		viaAddress,
		identifier,
		network,
		cancelAfter,
		amount,
		// TODO: add condition?
		fulfillmentTicket,
		condition,
		escrowId,
		sequenceNumber
	} = params;

	// check the payload for requirements
	if (
		!identifier ||
		!address ||
		!viaAddress ||
		!network ||
		!condition ||
		!amount ||
		!escrowId ||
		!fulfillmentTicket ||
		!sequenceNumber
	) {
		return {
			status: {
				message: 'invalid payload',
				code: 400
			}
		};
	}

	// see if cancelAfter is in the past
	const nowInRippleTime = Math.floor(Date.now() / 1000) - 946684800; // year 2000 epoch
	if (cancelAfter && cancelAfter < nowInRippleTime) {
		return {
			status: {
				message: 'expired',
				code: 400
			}
		};
	}

	// see if this address is one of the addresses we know about
	const ingresses = new Set();
	// process.env.ENOLA_INGRESS_ADDRESSES is a string "xrpl-livenet=rEt8yCY2rcbY94vyGrUDUAiRfea1cncpYU,xrpl-testnet=..."

	// setup our ingress addresses
	(process.env.ENOLA_INGRESSES || '').split(',').forEach((ingress) => {
		if (!ingress) {
			return;
		}
		let [net, addr] = ingress.split('=');
		// remove whitespace
		net = net.trim();
		addr = addr.trim();

		// change - to : (qstash limit of allowable chars in q names)
		net = net.replace(/-/g, ':');

		ingresses.add(`${net}>${addr}`); // xrpl-testnet=rEt8yCY2rcbY94vyGrUDUAiRfea1cncpYU
	});

	// see if this viaAddress is one of the addresses we know about
	if (!ingresses.has(`${network}>${viaAddress}`)) {
		return {
			status: { message: 'unknown address', code: 400 }
		};
	}

	// NB: this is an ingress function, it should only pass along the data
	// we should not trust this data, it should be validated by the
	// reading the ledger and its memo fields directly

	const queueName = `${network.replace(':', '-')}.onNewEscrow`;

	let response;
	try {
		// send to queue for processing
		response = await fetch('https://qstash.upstash.io/v1/publish/' + queueName, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Upstash-Content-Based-Deduplication': true, // prevent duplicate messages
				Authorization: 'Bearer ' + process.env.QSTASH_TOKEN
			},
			body: JSON.stringify({
				...params
			})
		});

		if (!response.ok) {
			log.error('error publishing to queue', response);
			return {
				status: { message: 'queue error', code: 500 }
			};
		}
	} catch (e) {
		log.error('redis error', e);
		return {
			status: { message: 'insert error', code: 500 }
		};
	}

	if (!response.ok) {
		log.error('error publishing to queue', response);
		return {
			status: { message: 'queue error', code: 500 }
		};
	}

	return {
		status: { message: 'success', code: 200 }
	};
};

export default {
	escrowNotify,
	setPayVia,
	submitKudosForFame
};
