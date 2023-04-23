import log from '$lib/logging';
import { logAuthAction } from '$lib/kyc.js';
import { redis } from '$lib/redis.js';
import { signMessage } from '$lib/keys';

const SEND_SOCIAL_ADDRESS = process.env.SEND_SOCIAL_ADDRESS || 'rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3';
const SEND_SOCIAL_BASE_URL =
	process.env.SEND_SOCIAL_BASE_URL || 'https://send-to-social.ident.agency';
// const SEND_SOCIAL_BOT_ADDRESS =
// 	process.env.SEND_SOCIAL_BOT_ADDRESS || 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59';
const SEND_SOCIAL_BOT_EMAIL = process.env.SEND_SOCIAL_BOT_EMAIL || `no-reply@notify.ident.agency`;
process.env.SEND_SOCIAL_BOT_EMAIL || `"--send-to-social--" <${SEND_SOCIAL_BOT_EMAIL}>`;
const SEND_SOCIAL_COST_XRP = parseInt(process.env.SEND_SOCIAL_COST_XRP || '0', 10) || 10; // xrp
const SEND_SOCIAL_EXPIRATION =
	parseInt(process.env.SEND_SOCIAL_EXPIRATION || '0', 10) || 60 * 60 * 24 * 30 * 3; // 3 months

const onTwitterAuthCallback = async ({ url }) => {
	// get all query params as a hash from searchParams
	const qp = Object.fromEntries(url.searchParams.entries());
	// log.info({ qp });

	let validated = ''; // signed message if we complete the auth
	let error = ''; // error message if we fail

	let ts = new Date().toISOString();
	ts = ts.replace(/\.\d{3}Z$/, 'Z'); // remove ms

	// get the state from the query param qp.state which is base64 encoded json
	const state = JSON.parse(Buffer.from(qp.state, 'base64').toString('ascii'));
	const nonce = state.nonce;
	const redir = state.redir;
	const address = state.address;

	const config = {
		client: {
			id: process.env.AUTH_TWITTER_CONSUMER_KEY,
			secret: process.env.AUTH_TWITTER_CONSUMER_SECRET
		}
	};

	const cacheKey = `auth-twitter-login-${address}`;
	const session = await redis.get(cacheKey);

	try {
		// 1. turn code into token, retrieve the username
		// via node-fetch

		const params = new URLSearchParams();
		params.append('grant_type', 'authorization_code');
		params.append('client_id', config.client.id);
		params.append('redirect_uri', session.redirectUri.split('?')[0]);
		params.append('code_verifier', session.codeVerifier); // for plain, use session.codeChallenge
		params.append('code', qp.code);

		const response = await fetch(`https://api.twitter.com/2/oauth2/token`, {
			method: 'POST',
			// headers: {
			//     'authorization': `Basic ${Buffer.from(`${config.client.id}:${config.client.secret}`).toString('base64')}`,
			// },
			body: params
		});

		// get status code
		let json;
		try {
			// get response data

			// {
			//     token_type: "bearer",
			//     expires_in: 7200,
			//     access_token: "Qy...MTowOmF0OjE",
			//     scope: "users.read offline.access",
			//     refresh_token: "ZXQwbnVHQzJ....J0OjE"
			//     },

			json = await response.json();
		} catch (e) {
			log.error(e);
		}

		// 2. get user details
		const me = await fetch(`https://api.twitter.com/2/users/me`, {
			method: 'GET',
			headers: {
				'content-type': 'application/json',
				Authorization: `Bearer ${json.access_token}`
			}
		});

		const twitterUser = await me.json();

		// 3. save the twitter user to redis
		if (twitterUser.data && twitterUser.data.username) {
			// we should sign the user data to prove we verified it
			const data = {
				user: twitterUser.data,
				tokens: {
					access_token: json.access_token,
					refresh_token: json.refresh_token
				}
			};

			const identifier = `did:kudos:twitter:${twitterUser.data.username.toLowerCase()}`;

			await logAuthAction({ method: 'twitter', identifier, data, address, ts });

			const cacheKey = `auth:${identifier}`;
			await redis.set(cacheKey, data); // last write wins
		} else {
			throw new Error('unable to get twitter user');
		}
		// const ex = {
		// 	out: '{"credential-map":["r4bqzg7iZFBGmLyYRa3o6vgtCMDzvVoRCh","did:kudos:email:mankins@gmail.com"],"signature":"3045022100c3d4756e943db74a4b8e848364f1cd88528824b2e3a290295968aa31197ebdd402207f7f6d52496e43ec2a1e8b2f23e6d48d7414630439c0df98fbc5f79018e2f62f1","mapping":{"costXrp":10,"address":"rhDEt27CCSbdA8hcnvyuVniSuQxww3NAs3","terms":"https://send-to-social.ident.agency/terms","expiration":3600}}',
		// 	signature:
		// 		'3044022051e2a98cd09a8ef867a6194c4f3e2f5f79654bc258cd38356b2963c65a1839ef0220447fea7279e464a6076dbafe0c869274af25ee7022f3d82fd9e461cc79e085e90'
		// };

		const out = {};
		const credentialMap = [];
		credentialMap.push(address);
		credentialMap.push(`did:kudos:twitter:${twitterUser.data.username.toLowerCase()}`);

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

		// const signature2 = await signMessage({
		//     message: out,
		//     address: SEND_SOCIAL_ADDRESS
		// });

		validated = JSON.stringify(out);
	} catch (e) {
		log.error(e);
		error = e.message;
		// return new Response(JSON.stringify({ error: 'unable to auth', status: 400 }), {
		// 	status: 400
		// });
	}
	// log.debug({ tokenSet });

	if (redir) {
		return new Response('', {
			status: 302,
			headers: {
				Location: `${redir}?nonce=${encodeURIComponent(nonce)}&msg=${encodeURIComponent(
					validated
				)}&error=${encodeURIComponent(error)}`
			}
		});
	}

	return new Response(JSON.stringify({ error: 'unable to auth', status: 400 }), {
		status: 400
	});
};

const cors = async () => {
	return new Response('', {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '600',

			'Cache-Control': 'max-age=60'
		}
	});
};

export { onTwitterAuthCallback as GET, cors as OPTIONS };
