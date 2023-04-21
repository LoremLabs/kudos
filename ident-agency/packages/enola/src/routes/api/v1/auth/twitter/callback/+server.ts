import { Issuer, TokenSet, generators } from 'openid-client';
import { disconnect, fulfillEscrow, getEscrowDataFromMemos } from '$lib/xrpl.js';

import { fetchToCurl } from "fetch-to-curl";
import { getIngressAddresses } from '$lib/configured.js';
import { getKycStatus } from '$lib/kyc.js';
import { getPayViaForNetwork } from '$lib/utils/escrow.js';
import log from '$lib/logging';
import { redis } from '$lib/redis.js';
import { verifyQueueRequest } from '$lib/queue.js';

// import {OAuth2} from 'oauth';


const onTwitterAuthCallback = async ({ url }) => {
	// get all query params as a hash from searchParams
	const qp = Object.fromEntries(url.searchParams.entries());

    log.info({qp});

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


    log.debug({ config });
    
	const issuer = new Issuer({
		issuer: 'https://twitter.com',
		authorization_endpoint: 'https://twitter.com/i/oauth2/authorize',
		token_endpoint: 'https://api.twitter.com/2/oauth2/token'
	});

	const cacheKey = `auth-twitter-login-${address}`;
	const session = await redis.get(cacheKey); // 15 minutes

	let codeVerifier = session?.codeVerifier;
    let codeChallenge = session?.codeChallenge;
log.debug({ codeVerifier, qp, session, address });

try {
    // turn code into token, retrieve the username
    // via node-fetch

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', config.client.id);
    params.append('redirect_uri', session.redirectUri.split('?')[0]);
    params.append('code_verifier', session.codeChallenge);
    params.append('code', qp.code);

    log.debug('a');
    const response = await fetch(`https://api.twitter.com/2/oauth2/token`, {method: 'POST', body: params});
    log.debug('b');

    // get status code
    const status = response.status;
    log.debug('c');
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
    log.debug({json, status});
    log.debug('e');

 // 2. get user details

    const me = await fetch(`https://api.twitter.com/2/users/me`, {
        method: 'GET',
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${json.access_token}`,
        },
    });

// log.info(fetchToCurl(
//     `https://api.twitter.com/2/users/me`, {
//         method: 'GET',
//         headers: {
//             'content-type': 'application/json',
//             Authorization: `Bearer ${json.access_token}`,
//         },
//     }
// ));

    const mejson = await me.json();

    log.debug('f');
    log.debug({me: mejson});

//  if (access.data && access.data.access_token) {
//     const me = await axios({
//       url: 'https://api.twitter.com/2/users/me',
//       method: 'get',
//       headers: {
//         'content-type': 'application/json',
//         Authorization: `Bearer ${access.data.access_token}`,
//       },
//     })

//     if (me.data && me.data.data) {
//       userProvider = {
//         // since twitter does not return email, we construct a dummy email for database
//         email: `${me.data.data.username}.${me.data.data.id}@example.com`,
//         name: me.data.data.name,
//       }
//     }
//   }


return new Response(JSON.stringify({json, qp, me: mejson, p: params.toString()}), {
    status: 200
});

} catch (e) {
    log.error(e);
    return new Response(JSON.stringify({ error: 'unable to auth', status: 400 }), {
        status: 400
    });
}
	// log.debug({ tokenSet });

	if (false && redir) {
		return new Response('', {
			status: 302,
			headers: {
				Location: `${redir}?state=${nonce}`
			}
		});
	}
	// // return a response object
	// return new Response(JSON.stringify({ code, nonce, redir }), {
	// 	status: 200
	// 	// headers: {
	// 	// }
	// });
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
