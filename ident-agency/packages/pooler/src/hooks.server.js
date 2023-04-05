import accepts from 'accepts';
import flatten from 'flat';
import log from '$lib/logging';
import { sequence } from '@sveltejs/kit/hooks';
import { timeIt } from '$lib/utils';
import { v4 as uuid } from 'uuid';

// persists for lifetime of process
const nodeId = uuid();

const logger = async ({ event, resolve }) => {
	// create request id
	let rid = event.request.headers.get('request-id') || event.locals.rid || uuid();
	event.request.headers.set('request-id', rid);
	event.locals.rid = rid;

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

/** @type {import('@sveltejs/kit').Handle} */
export async function couchHooks({ event, resolve }) {
	event.locals = event.locals || {};
	event.locals.nodeId = nodeId;
	event.locals.startTs = timeIt(); // start timer, just for couch

	const rid = (event.locals.rid = uuid());
	let response = await resolve(event);

	const couchdbBodyTime = timeIt(event.locals.startTs);
	response.headers.set('x-couchdb-body-time', couchdbBodyTime);

	// set request id (again)
	response.headers.set('x-couch-request-id', rid);

	if (response.headers.get('cache-control') === null) {
		response.headers.set('cache-control', 'must-revalidate');
	}

	if (
		response.headers.get('content-type') === null ||
		response.headers.get('content-type').includes('text/plain')
	) {
		// use accept header to decide between text/plain and application/json unless set explicitly (except if set explicitly to text/plain)

		const accept = accepts({ headers: { accept: event.request.headers.get('accept') } });
		const acceptType = accept.type(['application/json', 'text/plain']);

		response.headers.set(
			'content-type',
			acceptType === 'application/json' ? 'application/json' : 'text/plain; charset=utf-8'
		);
	}

	return response;
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error }) {
	// , event
	// example integration with https://sentry.io/
	// TODO: Sentry.captureException(error, { event });

	// TODO: how to return as JSON:
	// error: "not_found",
	// reason: "missing"

	return { message: error.message || 'An error occurred' };
}

//export const handle: Handle = sequence(logger, auth.handleHooks());
export const handle = sequence(logger, couchHooks);
