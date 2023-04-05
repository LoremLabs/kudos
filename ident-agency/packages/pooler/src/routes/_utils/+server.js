import { error } from '@sveltejs/kit';

export const GET = async ({ request, url, locals }) => {
	return new Response('', {
		status: 302,
		headers: {
			// 'Content-Type': 'application/json',
			Location: '/_utils/index.html'
		}
	});
};
