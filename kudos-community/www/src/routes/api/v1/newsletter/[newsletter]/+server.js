import { addEmailToList } from '$lib/email/newsletter';
import { error } from '@sveltejs/kit';
import log from '$lib/logging';

/** @type {import('./$types').RequestHandler} */
export async function POST({ params, request }) {
	const newsletter = params.newsletter || 'announce'; // kudos_announce@notify.kudos.community

	const options = await request.json();

	if (!options.email) {
		throw error(400, 'Missing email');
	}

	const email = options.email.trim().toLowerCase();

	// check that it looks like an email with a two digit tld
	if (!email.match(/.+@.+\..{2,}/)) {
		throw error(400, 'Invalid email');
	}

	// if we have anything in the honeypot, then this is a bot
	if (options.hp) {
		log.warn('bot detected', { email, options });
		throw error(400, 'List is full'); // ha ha?
	}

	const output = await addEmailToList({
		listAddress: `kudos_${newsletter}@notify.kudos.community`,
		email
	});

	const response = new Response(JSON.stringify({ ...output }));
	return response;
}
