import flatten from 'flat';
// import { sequence } from '@sveltejs/kit/hooks';
// import auth from '$lib/server/auth';
import log from '@kudos-protocol/logging';
import { v4 as uuid } from 'uuid';

const logger = async ({ event, resolve }) => {
	// create request id
	let rid = event.request.headers.get('request-id') || uuid();
	event.request.headers.set('request-id', rid);

	const requestStartTime = Date.now();
	const response = await resolve(event);
	response.headers.set('request-id', rid);

	// get client ip
	let clientIp;
	try {
		clientIp = event.getClientAddress();
	} catch (_e) {
		clientIp = event.request.headers.get('x-vercel-ip');
	}

	// get headers
	// const headers = {};
	// for (const [key, value] of event.request.headers) {
	//   headers[key] = value;
	// }

	// console.log({headers});
	const entry = {
		ns: 'req',
		ts: new Date(requestStartTime).toISOString(),
		method: event.request.method,
		path: event.url.pathname,
		rt: parseInt(`${Date.now() - requestStartTime}`, 10),
		status: response.status,
		params: Object.fromEntries(event.url.searchParams.entries()),
		rid,
		clientIp,
		host: event.request.headers.get('host'),
		referer: event.request.headers.get('referer'),
		ua: event.request.headers.get('user-agent'),
		country: event.request.headers.get('x-vercel-ip-country'),
		city: event.request.headers.get('x-vercel-ip-city'),
		tz: event.request.headers.get('x-vercel-ip-timezone'),
		vercelId: event.request.headers.get('x-vercel-id')
	};
	Object.keys(entry).forEach((key) => {
		// remove undefined values
		if (entry[key] === undefined) {
			delete entry[key];
		}
		// remove null values
		if (entry[key] === null) {
			delete entry[key];
		}
		// remove empty objects
		if (typeof entry[key] === 'object' && Object.keys(entry[key]).length === 0) {
			delete entry[key];
		}
	});

	log.info(flatten(entry)); // flatten the object so we can use it in elasticsearch
	return response;
};

//export const handle: Handle = sequence(logger, auth.handleHooks());
export const handle = logger;
