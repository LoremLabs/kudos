import { error } from '@sveltejs/kit';

export const GET = async ({ request, url, locals, params }) => {
	// // get keys from query params
	// let keys = url.searchParams.get('keys') || '';
	// if (typeof keys === 'string') {
	// 	keys = keys.split(',');
	// }

	// const offset = url.searchParams.get('offset') || 0;
	const { db } = params;

	const body = {
		"cluster": {
			"n": 3,
			"q": 8,
			"r": 2,
			"w": 2
		},
		"compact_running": false,
		"db_name": db,
		"doc_count": 0,
		"doc_del_count": 0,
		"instance_start_time": "0",
		"props": {},
		"purge_seq": 0,
		"sizes": {
			"active": 0,
			"external": 0,
			"file": 0
		},
		"update_seq": "tktk"
	}

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};

export const POST = async ({ request, url, locals }) => {
	const input = await request.json();
	let { keys } = input;
	const body = {};

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};

export const PUT = async ({ request, url, locals }) => {
	const input = await request.json();
	let { keys } = input;
	const body = {};

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
