import { error } from '@sveltejs/kit';
import { v4 as uuid } from 'uuid';

export const GET = async ({ request, url, locals }) => {
	// get count from query params
	let count = parseInt(url.searchParams.get('count'), 10) || 1;
	if (count > 500) {
		count = 500;
	}

	// generate count uuids

	const uuids = [];
	for (let i = 0; i < count; i++) {
		let newUuid = uuid();
		// remove dashes
		newUuid = newUuid.replace(/-/g, '');
		uuids.push(newUuid);
	}

	return new Response(JSON.stringify({ uuids }), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
