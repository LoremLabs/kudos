import { currentCohort } from '$lib/utils/date';
// import { redirect } from '@sveltejs/kit';

export function GET({}) {
	// create a response object that redirects to the current cohort
	return new Response(null, {
		status: 302,
		headers: {
			location: `/leaderboards/${currentCohort()}`
		}
	});
}
