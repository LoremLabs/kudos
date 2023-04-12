// import { currentCohort } from '$lib/utils/date';
import { error } from '@sveltejs/kit';
// DEBUGGING
// import { fetchToCurl } from 'fetch-to-curl';

// const identResolver = process.env.IDENT_RESOLVER || 'https://graph.ident.agency';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const did = params.did;

	// if no did, we should error
	if (!did) {
		return error(404, 'Not Found');
	}

	return {
		props: {
			did
		}
	};
}
