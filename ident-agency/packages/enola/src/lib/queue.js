import { Client as QstashPublish, Receiver as QstashReceive } from '@upstash/qstash';

import log from '@kudos-protocol/logging';

const qstashReceive = new QstashReceive({
	currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
	nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
});

const qstashPublish = new QstashPublish({
	token: process.env.QSTASH_TOKEN
});

export const queuePublish = async (request) => {
	return await qstashPublish.publishJSON(request);
};

export const verifyQueueRequest = async function ({ request }) {
	const body = await request.text(); // raw request body
	const isValid = await qstashReceive.verify({
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
		log.warn('verifyQueueRequest invalid');
		throw new Error('invalid request');
	}

	// parse the body
	const params = JSON.parse(body); // error on fail
	return params;
};
