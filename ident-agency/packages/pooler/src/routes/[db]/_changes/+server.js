import { error } from '@sveltejs/kit';

export const GET = async ({ request, url, locals }) => {
	// get keys from query params
	let keys = url.searchParams.get('keys') || '';
	if (typeof keys === 'string') {
		keys = keys.split(',');
	}

	const offset = url.searchParams.get('offset') || 0;

	return await handler({ request, url, locals, keys, offset });
};

export const POST = async ({ request, url, locals }) => {
	const input = await request.json();
	let { keys } = input;

	if (typeof keys === 'string') {
		keys = keys.split(',');
	}

	const offset = url.searchParams.get('offset') || 0;
	// console.log({keys, offset, input});
	return await handler({ request, url, locals, keys, offset });
};

const handler = async ({ request, url, locals, keys, offset }) => {
	// https://docs.couchdb.org/en/stable/api/database/changes.html

	const body = {};

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
