import { Receiver as Qstash } from '@upstash/qstash';

const qstash = new Qstash({
	currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
	nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
});

export const verifyQueueRequest = async function ({ request }) {
	const body = await request.text(); // raw request body
	const isValid = await qstash.verify({
		/**
		 * The signature from the `Upstash-Signature` header.
		 *
		 * Please note that on some platforms (e.g. Vercel or Netlify) you might
		 * receive the header in lower case: `upstash-signature`
		 *
		 */
		signature: request.headers.get('upstash-signature'),

		/**
		 * The raw request body.
		 */
		body,

		/**
		 * Number of seconds to tolerate when checking `nbf` and `exp` claims, to deal with small clock differences among different servers
		 *
		 * @default 0
		 */
		clockTolerance: 2
	});

	if (!isValid) {
		throw new Error('invalid request');
	}

	// parse the body
	const params = JSON.parse(body); // error on fail
	return params;
};
