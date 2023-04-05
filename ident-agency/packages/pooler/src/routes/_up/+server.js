import { error } from '@sveltejs/kit';
import { v4 as uuid } from 'uuid';

export const GET = async ({ request, url, locals }) => {
	const status = 'ok';

	return new Response(JSON.stringify({ status }), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
