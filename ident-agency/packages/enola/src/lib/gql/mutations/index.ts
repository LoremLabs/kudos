import * as secp256k1 from '@noble/secp256k1';

import { composeEmail, sendEmail } from '$lib/email/email';
import { hexToBytes, validate } from '$lib/keys';

import { BloomFilter } from 'bloomfilter';
import { bytesToHex } from '@noble/hashes/utils';
import { currentCohort } from '$lib/utils/date';
import log from '$lib/logging';
import { redis } from '$lib/redis.js';
import { sha256 } from '@noble/hashes/sha256';
import { shortId } from '$lib/utils/short-id';
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
	parseInt(process.env.SEND_SOCIAL_EXPIRATION || '0', 10) || 60 * 60; // 1 hr

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

const checkPoolId = async ({ address, currentUser, poolId }) => {
	// currentUser: {
	// 	a: 'rEJuUnspz71p4Zmg5VNeWcHvhsyQTBW2o6', // address (should match signature)
	// 	n: [ 'kudos' ], (networks)
	// 	t: [ 'kudos:store', 'kudos:read', 'kudos:summary' ], // types
	// 	s: [ 'i:*' ] } // scope

	// address should === currentUser.a;
	if (address !== currentUser.a) {
		log.debug('address !== currentUser.a', { address, currentUser });
		throw new Error('Invalid address');
	}

	// check the poolId against the currentUser
	const poolName = await redis.hget(`pools:${address}`, `i:${poolId}`);
	log.debug('poolName', { poolName, poolId, address });
	if (!poolName) {
		throw new Error('Invalid poolId');
	}

	if (
		!currentUser.s.includes('i:*') &&
		!currentUser.s.includes(`n:${poolName}`) &&
		!currentUser.s.includes(`i:${poolId}`)
	) {
		// NB: poolName scope is more permissive, allowing any prefix match
		throw new Error('Invalid poolId');
	}

	return poolName;
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

export const submitPoolRequest = async (root, params, context) => {
	log.debug('---------------------', { params, context });

	const currentUser = context.currentUser || {}; // from the auth hook
	log.debug('--currentUser--', currentUser);

	// TODO: more validation

	// check the signature to see if it came from this request and rid
	const { rid, path, signature } = params;
	let input;
	let authed = false;

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

		if (signature !== 'auth') {
			await validate({
				signature,
				message: params.in, // original stringified payload
				input,
				rid
			});
			authed = true;
		} else {
			// the request auth should happen in the path function, if !authed
			// currentUser: {
			// 	a: 'rEJuUnspz71p4Zmg5VNeWcHvhsyQTBW2o6', // address (should match signature)
			// 	n: [ 'kudos' ], (networks)
			// 	t: [ 'kudos:store', 'kudos:read', 'kudos:summary' ], // types
			// 	s: [ 'i:*' ] } // scope
			// should validate within path function
		}

		// at this point we're guaranteed that the request is coming from the correct input.address
		switch (path) {
			case '/pool/create': {
				// create a pool
				const out = {};

				// input = { address, poolName }
				// data is an array of { scope, object(id), weight, context}
				let { poolName } = input;
				poolName = poolName.trim().toLowerCase();
				const { address } = input;

				// throw error if no address or poolName
				if (!address || !poolName) {
					throw new Error('Missing parameters');
				}

				let poolId = shortId();

				const ok = await redis.hsetnx(`pools:${address}`, `n:${poolName}`, poolId);

				if (!ok) {
					// get the poolId
					const existingId = await redis.hget(`pools:${address}`, `n:${poolName}`);
					if (existingId) {
						poolId = existingId;
					} else {
						throw new Error('Could not create pool');
					}
				} else {
					// store the name by id
					await redis.hsetnx(`pools:${address}`, `i:${poolId}`, poolName);
				}

				out.pool = { id: poolId, name: poolName };

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.rid = input.rid || shortId(); // not quite a request id, but a transaction id
				reply.response.signature = signature2;

				break;
			}
			case '/pool/get/summary': {
				// get a pool with details
				const out = {};

				const { address, poolId, top, opts } = input;
				let { amount } = input;
				if (!amount || amount === 'NaN') {
					amount = 0;
				}

				if (!authed) {
					const { t: entitlements } = currentUser;
					// console.log({ currentUser });
					// TODO: shiro compatible: kudos:write
					if (!entitlements || !entitlements.includes('kudos:summary')) {
						throw new Error('Not authorized');
					}

					// check if address is in the list of addresses
					const { a: addr } = currentUser;
					if (address && address !== addr) {
						throw new Error('Not authorized');
					}
				}

				out.poolName = await checkPoolId({ address, poolId, currentUser });

				// retrieve the pool details
				const pool = await redis.hgetall(`pool:${address}:${poolId}`);

				// convert weight back into string
				for (const key in pool) {
					const kudo = pool[key];
					if (kudo.weight) {
						kudo.weight = kudo.weight.toString();
					} else {
						delete pool[key];
					}
				}

				// calculate the total weight
				const totalWeight = Object.values(pool).reduce((acc, kudo) => {
					return acc + parseFloat(kudo.weight);
				}, 0);

				// get the weight by Identifier
				const weightByIdentifier = Object.values(pool).reduce((acc, kudo) => {
					const { identifier, weight } = kudo;
					if (acc[identifier]) {
						acc[identifier] += parseFloat(weight);
					} else {
						acc[identifier] = parseFloat(weight);
					}

					return acc;
				}, {});
				// convert weight back into string
				for (const key in weightByIdentifier) {
					weightByIdentifier[key] = weightByIdentifier[key].toFixed(6).toString();
				}

				// top 10
				// const top10 = Object.entries(weightByIdentifier).sort((a, b) => {
				// 	return b[1] - a[1];
				// }).slice(0, 10);

				out.totalWeight = totalWeight.toFixed(6);
				// out.top = top10;
				// out.identifiers = weightByIdentifier;

				// out.top is an array of { identifier, weight }, ordered to top 10
				if (top) {
					out.top = Object.entries(weightByIdentifier)
						.sort((a, b) => {
							return b[1] - a[1];
						})
						.slice(0, top)
						.map(([identifier, weight]) => {
							return { identifier, weight };
						});
				}
				let slivers = 0;

				out.identities = Object.entries(weightByIdentifier)
					.sort((a, b) => {
						return b[1] - a[1];
					})
					.map(([identifier, weight]) => {
						const share = parseFloat(weight) / parseFloat(totalWeight);
						if (share && share > 0 && amount) {
							const sliver = (share * parseFloat(amount || 0)).toFixed(6).toString();
							slivers += share * parseFloat(amount || 0);
							if (sliver !== 'NaN') {
								return { identifier, weight, sliver };
							} else {
								return { identifier, weight };
							}
						} else {
							return { identifier, weight };
						}
					});

				if (amount) {
					out.amount = amount;
				}

				if (opts && opts.showSlivers) {
					out.slivers = slivers.toFixed(6).toString();
				}

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.signature = signature2;

				break;
			}
			case '/pool/get/details': {
				// get a pool with details
				const out = {};

				const { address, poolId } = input;

				if (!authed) {
					const { t: entitlements } = currentUser;
					// console.log({ currentUser });
					// TODO: shiro compatible: kudos:write
					if (!entitlements || !entitlements.includes('kudos:read')) {
						throw new Error('Not authorized');
					}

					// check if address is in the list of addresses
					const { a: addr } = currentUser;
					if (address && address !== addr) {
						throw new Error('Not authorized');
					}
				}

				out.poolName = await checkPoolId({ address, poolId, currentUser });

				// retrieve the pool details
				const pool = await redis.hgetall(`pool:${address}:${poolId}`);

				// convert weight back into string
				for (const key in pool) {
					const kudo = pool[key];
					if (kudo.weight) {
						kudo.weight = kudo.weight.toString();
					} else {
						delete pool[key];
					}
				}

				out.pool = pool;

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.signature = signature2;

				break;
			}
			case '/pool/list': {
				// list available pools
				const out = {};

				// input = { address, rid, data }
				const { matching } = input;
				// data is an array of { scope, object(id), weight, context}

				// get the list of pools from redis
				const poolIds = await redis.hgetall(`pools:${input.address}`);

				const pools = [];
				for (const key in poolIds) {
					if (matching) {
						// matching can be i: for id, or n: for name (default)

						if (matching.startsWith('i:') && key.startsWith('i:') && key === matching) {
							const poolId = key.substring(2);
							const poolName = poolIds[key];
							pools.push({ id: poolId, name: poolName });
						} else if (key.startsWith('n:') && key.substring(2).includes(matching.substring(2))) {
							const poolId = poolIds[key];
							const poolName = key.substring(2);
							pools.push({ id: poolId, name: poolName });
						} else if (key.startsWith('n:') && key.substring(2).includes(matching)) {
							// no prefix
							const poolId = poolIds[key];
							const poolName = key.substring(2);
							pools.push({ id: poolId, name: poolName });
						}
					} else {
						if (key.startsWith('n:')) {
							const poolId = poolIds[key];
							const poolName = key.substring(2);
							pools.push({ id: poolId, name: poolName });
						}
					}
				}

				out.pools = pools;

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.signature = signature2;

				break;
			}
			case '/pool/ink': {
				// write the data to the database

				// see if we have write permissions
				const { t: entitlements } = currentUser;
				// console.log({ currentUser });
				// TODO: shiro compatible: kudos:write
				if (!entitlements || !entitlements.includes('kudos:store')) {
					throw new Error('Not authorized');
				}

				const { address, poolId, kudos } = input;

				// see if the poolId matches our auth
				const poolName = await checkPoolId({ address, poolId, currentUser });

				// only allow batches of 10000
				if (kudos.length > 10_000) {
					throw new Error('Use batches, over limit: ' + kudos.length);
				}

				// if we're here, we can read in the input data and store it
				const pipeline = redis.pipeline();

				const keyvals = {};
				for (const kudo of kudos) {
					// {
					// 	"identifier": "did:kudos:email:b...",
					// 	"weight": "0.001748",
					// 	"id": "Lvun4tpqS9BC7ajoXLscVW",
					// 	"traceId": "LqmAyCHoyRSAJetXNbKMDA",
					// 	"ts": "2023-04-18T14:38:05Z",
					// 	"description": "code.lib.nodejs.yargs-parser"
					//   }

					// normalize weight, using 0 to skip
					kudo.weight = parseFloat(kudo.weight);
					if (kudo.weight > 1) {
						kudo.weight = 1;
					}
					if (kudo.weight < 0) {
						kudo.weight = 0;
					}
					if (!kudo.weight) {
						kudo.weight = 1;
					}

					// check for required params: id, identifier, ts
					if (!kudo.id) {
						throw new Error('Missing id');
					}
					if (!kudo.identifier) {
						throw new Error('Missing identifier');
					}
					if (!kudo.ts) {
						throw new Error('Missing ts');
					}

					if (kudo.weight > 0) {
						keyvals[kudo.id] = kudo;
					}
				}

				pipeline.hset(`pool:${address}:${poolId}`, keyvals);
				await pipeline.exec(); // TODO: batch in groups

				const out = {
					poolName
				};

				// if we're here, we can read in the input data and store it

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.signature = signature2;

				break;
			}
			case '/pool/ink/receipts': {
				// write receipt data to the database

				// see if we have write permissions
				const { t: entitlements } = currentUser;
				// console.log({ currentUser });
				// TODO: shiro compatible: kudos:write
				if (!entitlements || !entitlements.includes('kudos:store')) {
					throw new Error('Not authorized');
				}

				const { address, poolId, receipts } = input;

				// see if the poolId matches our auth
				const poolName = await checkPoolId({ address, poolId, currentUser });

				// only allow batches of 10000
				if (receipts.length > 10_000) {
					throw new Error('Use batches, over limit: ' + receipts.length);
				}

				// if we're here, we can read in the input data and store it
				const pipeline = redis.pipeline();

				const keyvals = {};
				for (const kudo of receipts) {
					// {
					// 	"identifier": "did:kudos:email:b...",
					// 	"weight": "-0.001748",
					// 	"id": "Lvun4tpqS9BC7ajoXLscVW",
					// 	"traceId": "LqmAyCHoyRSAJetXNbKMDA",
					// 	"ts": "2023-04-18T14:38:05Z",
					// 	"receipt": {"tx":"abcd","amount": "30.004","type":"escrow"}
					//   }

					// normalize weight, using 0 to skip
					kudo.weight = parseFloat(kudo.weight);

					// weights here can be any value.
					// if (kudo.weight < -1) {
					// 	kudo.weight = -1;
					// }
					if (kudo.weight > 0) {
						kudo.weight = 0;
					}
					if (!kudo.weight) {
						kudo.weight = -1;
					}

					// check for required params: id, identifier, ts
					if (!kudo.id) {
						throw new Error('Missing id');
					}
					if (!kudo.identifier) {
						throw new Error('Missing identifier');
					}
					if (!kudo.ts) {
						throw new Error('Missing ts');
					}
					if (!kudo.receipt) {
						throw new Error('Missing receipt');
					}

					// receipts must have a negative weight
					if (kudo.weight < 0) {
						keyvals[kudo.id] = kudo;
					}
				}

				pipeline.hset(`pool:${address}:${poolId}`, keyvals);
				await pipeline.exec(); // TODO: batch in groups

				const out = {
					poolName
				};

				// if we're here, we can read in the input data and store it

				const signature2 = await signMessage({
					message: out,
					address: SEND_SOCIAL_ADDRESS
				});

				reply.response.out = JSON.stringify(out);
				reply.response.signature = signature2;

				break;
			}
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
					from: botEmail,
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
			} else if (e.message === 'Parameter "key" is required') {
				reply.status.code = 500;
				reply.status.message = 'Internal error: missing mail key';
				return reply;
			} else if (e.message === 'Not authorized') {
				reply.status.code = 401;
				reply.status.message = 'Not authorized';
				return reply;
			} else if (e.message === 'Missing parameters') {
				reply.status.code = 400;
				reply.status.message = 'Missing parameters';
				return reply;
			} else if (e.message === 'Invalid poolId') {
				reply.status.code = 400;
				reply.status.message = 'Invalid poolId';
				return reply;
			} else if (e.message === 'Invalid address') {
				reply.status.code = 400;
				reply.status.message = 'Invalid address';
				return reply;
			} else if (e.message === 'Invalid code') {
				reply.status.code = 401;
				reply.status.message = 'Invalid code';
				return reply;
			} else if (e.message.includes('Use batches, over limit')) {
				reply.status.code = 400;
				reply.status.message = e.message;
				return reply;
			}
		}
		throw e; // other
	}

	log.debug('reply', reply);

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
	const addressStateChange: AddressState = {}; // used for hmset

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
