import * as secp256k1 from '@noble/secp256k1';

import { bytesToHex, hexToBytes as hexTo } from '@noble/hashes/utils';
import { composeEmail, sendEmail } from '$lib/email/email';

import { BloomFilter } from 'bloomfilter';
import addressCodec from 'ripple-address-codec';
import { currentCohort } from '$lib/utils/date';
import hashjs from 'hash.js';
import log from '$lib/logging';
import { redis } from '$lib/redis.js';
import { sha256 } from '@noble/hashes/sha256';
import { utils } from 'ethers'; // TODO: must be a better way, also this is pegged to v5

const SEND_SOCIAL_ADDRESS = process.env.SEND_SOCIAL_ADDRESS || 'rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3';
const SEND_SOCIAL_BASE_URL =
	process.env.SEND_SOCIAL_BASE_URL || 'https://send-to-social.ident.agency';
const SEND_SOCIAL_BOT_ADDRESS =
	process.env.SEND_SOCIAL_BOT_ADDRESS || 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59';
const SEND_SOCIAL_BOT_EMAIL = process.env.SEND_SOCIAL_BOT_EMAIL || `no-reply@notify.ident.agency`;
process.env.SEND_SOCIAL_BOT_EMAIL || `"--send-to-social--" <${SEND_SOCIAL_BOT_EMAIL}>`;
const SEND_SOCIAL_COST_XRP = parseInt(process.env.SEND_SOCIAL_COST_XRP || '0', 10) || 10; // xrp
const SEND_SOCIAL_EXPIRATION =
	parseInt(process.env.SEND_SOCIAL_EXPIRATION || '0', 10) || 60 * 60 * 24 * 90; // 3 months

const hexToBytes = (hex) => {
	// check if it's a hex string, starting with 0x
	if (typeof hex === 'string' && hex.match(/^0x([0-9a-f][0-9a-f])*$/i)) {
		// strip off the 0x
		hex = hex.slice(2);
	}

	return hexTo(hex);
};

const normalizePrivateKey = (privateKey) => {
	if (typeof privateKey === 'string') {
		if (privateKey.length === 66) {
			// remove 00 prefix
			privateKey = privateKey.slice(2);
		}
	}

	return privateKey;
};

const signMessage = async ({ message, address }) => {
	const hashedMessage = sha256(JSON.stringify(message));
	const { privateKey } = await getKeys(address);

	const [sig, recId] = await secp256k1.sign(hashedMessage, hexToBytes(privateKey), {
		recovered: true
	});

	return `${bytesToHex(sig)}${recId}`;
};

export const getKeys = async function (address) {
	// TODO: get seed from vault directly

	// we iterate through process.env.WALLET_SEED_* and find the one that matches the address. Values are address:data:data2
	// where data is the public key and data2 is the private key

	let found = null;
	for (const key in process.env) {
		if (key.startsWith('WALLET_SEED_')) {
			const keyString = process.env[key] as string;
			const [walletAddress, publicKey, privateKey] = keyString.split(':');

			if (walletAddress === address) {
				found = { walletAddress, publicKey, privateKey: normalizePrivateKey(privateKey) };
				break;
			}
		}
	}

	if (!found) {
		throw new Error(`Wallet seed not found for address: ${address}`);
	}

	return found;
};

const validate = async (params) => {
	const { signature, message, input } = params;

	// signature = '0x' + signature + recId // recId is last byte of signature
	const sig = signature.slice(0, -1);
	const recId = parseInt(signature.slice(-1), 10);

	function deriveAddressFromBytes(publicKeyBytes) {
		const publicKeyHash = computePublicKeyHash(publicKeyBytes);
		return addressCodec.encodeAccountID(publicKeyHash);
	}

	function computePublicKeyHash(publicKeyBytes) {
		const hash256 = hashjs.sha256().update(publicKeyBytes).digest();
		const hash160 = hashjs.ripemd160().update(hash256).digest();
		return hash160; // was Buffer.from(hash160);
	}

	// log.info(JSON.stringify({ sig, recId, message }));
	let verified = {};
	try {
		const hashedMessage = sha256(message);

		// get the public key from the signature
		const publicKey = bytesToHex(secp256k1.recoverPublicKey(hashedMessage, sig, recId, true));
		const sigAddress = deriveAddressFromBytes(hexToBytes(publicKey));

		// check if message.address matches the address derived from the signature
		if (sigAddress !== input.address) {
			throw new Error('Invalid address:' + sigAddress + ' != ' + input.address);
		}

		// verify the signature
		verified = secp256k1.verify(hexToBytes(sig), hashedMessage, hexToBytes(publicKey));

		if (!verified) {
			throw new Error('Invalid signature');
		}
	} catch (e) {
		console.log(e.message);
		throw new Error('Invalid signature');
	}

	log.debug('verified', verified);

	return verified;
};

export const submitPoolRequest = async (_, params) => {
	log.debug('---------------------', params);

	// TODO: more validation

	// check the signature to see if it came from this request and rid
	const { rid, path, signature } = params;
	let input;

	const reply = {
		status: {
			code: 200,
			message: 'OK'
		},
		response: {
			publicKey: '',
			rid,
			path,
			out: '',
			signature: ''
		}
	};

	try {
		input = JSON.parse(params.in);

		// validate the signature
		// const { keys, signature, message } = params;

		await validate({
			signature,
			message: params.in, // original stringified payload
			input,
			rid
		});

		switch (path) {
			case '/auth/email/verify': {
				const out = {};

				// check the code
				const cacheKey = `auth-email-login-${input.rid}`;
				const cached = await redis.get(cacheKey);
				if (!cached) {
					throw new Error('Invalid code');
				}

				// we can create a credential-map that this email address is owned by this address
				const credentialMap = [];
				credentialMap.push(cached.address);
				credentialMap.push(`did:kudos:email:${cached.email}`);

				// we will sign this credential map with our private key

				// create a signature
				const signature = await signMessage({
					message: credentialMap,
					address: SEND_SOCIAL_ADDRESS
				});

				out['credential-map'] = credentialMap;
				out.signature = signature;

				const mapping = {};
				mapping.costXrp = SEND_SOCIAL_COST_XRP; // xrp
				mapping.address = SEND_SOCIAL_ADDRESS;
				mapping.terms = `${SEND_SOCIAL_BASE_URL}/terms`;
				mapping.expiration = SEND_SOCIAL_EXPIRATION;

				out.mapping = mapping;

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.rid = input.rid; // not quite a request id, but a transaction id
				reply.response.signature = signature2;

				break;
			}
			case '/auth/email/login': {
				// start email stuff

				// generate a 6 character code from the alphabet: BCDFGHJKLMNPQRSTVWXZ
				// from: https://www.oauth.com/oauth2-servers/device-flow/authorization-server-requirements/
				const alphabet = 'BCDFGHJKLMNPQRSTVWXZ';
				const randChars = (length) =>
					Array.from({ length })
						.map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
						.join('');
				const code = `${randChars(4)}-${randChars(4)}`;

				// reply.status.message = code;

				const out = {};
				out.rid = rid;
				out.nonce = input.nonce; // client should check that this matches the nonce sent in the request

				// save the code to redis
				const cacheKey = `auth-email-login-${rid}`;
				await redis.set(cacheKey, JSON.stringify({ ...input, code }), { EX: 60 * 15 }); // 15 minutes

				// create email
				const email = input.email.trim();

				// TODO	HERE
				const output = await composeEmail({
					template: 'auth-link-01',
					options: { to: email, baseUrl: SEND_SOCIAL_BASE_URL, locals: { code } }
				});

				const botEmail = SEND_SOCIAL_BOT_EMAIL;
				const msg = {
					'h:Sender': botEmail,
					from: SEND_SOCIAL_BOT_ADDRESS,
					to: [email],
					//        bcc: [email],
					subject: output.subject || '👉 Login Code',
					//text,
					html: output.html,
					//        headers, // must have h: prefix, but maybe we don't want them anyway
					// attachment: files,
					'o:tracking-clicks': 'htmlonly',
					'o:tag=': 'login'
				};

				const result = await sendEmail(msg);
				// log.debug({ result });
				out.result = result;
				// send email

				reply.response.out = JSON.stringify(out);

				break;
			}
			default: {
				reply.status.code = 400;
				reply.status.message = 'Invalid path';
				break;
			}
		}
	} catch (e) {
		log.info(e);
		if (e instanceof SyntaxError) {
			reply.status.code = 400;
			reply.status.message = 'Invalid input';
			return reply;
		}
		if (e instanceof Error) {
			if (e.message === 'Invalid signature') {
				reply.status.code = 401;
				reply.status.message = 'Invalid signature';
				return reply;
			}
		}
		throw e; // other
	}

	return reply;
};

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
	submitKudosForFame,
	submitPoolRequest
};
