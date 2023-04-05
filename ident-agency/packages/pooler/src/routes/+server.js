import { name, version } from '../../package.json';

import accepts from 'accepts';
import { error } from '@sveltejs/kit';

export function GET({ request, url, locals }) {
	// https://docs.couchdb.org/en/stable/api/server/common.html
	// Request Headers
	// Accept –
	// application/json
	// text/plain
	// Response Headers
	// Content-Type –
	// application/json
	// text/plain; charset=utf-8
	// Status Codes
	// 200 OK – Request completed successfully

	// if the Accept header is application/json, return the JSON response (default)
	const body = {
		couchdb: 'Welcome',
		version,
		vendor: {
			name,
			version
		},
		// features: [
		// 	'access-ready',
		// 	'partitioned',
		// 	'pluggable-storage-engines',
		// 	'reshard',
		// 	'shardalot',
		// 	'sorted',
		// 	'update-delete-attachments'
		// ],
		uuid: locals.nodeId
	};

	// get the Accept header
	const accept = accepts({ headers: { accept: request.headers.get('accept') } });
	const acceptType = accept.type(['application/json', 'text/plain']);

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			'Content-Type':
				acceptType === 'application/json' ? 'application/json' : 'text/plain; charset=utf-8',
			'Cache-Control': 'no-cache'
		}
	});
}
