import { error } from '@sveltejs/kit';
import { v4 as uuid } from 'uuid';

export const GET = async ({ request, url, locals }) => {
	const body = {
		info: {
			authenticated: 'cookie',
			authentication_db: '_users',
			authentication_handlers: ['cookie', 'default']
		},
		ok: true,
		userCtx: {
			name: 'root',
			roles: ['_admin']
		}
	};

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};

export const POST = async ({ request, url, locals }) => {
	const body = { ok: true, name: 'root', roles: ['_admin'] };

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
