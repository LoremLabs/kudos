import { currentCohort } from '$lib/utils/date';
import { error } from '@sveltejs/kit';
// DEBUGGING
// import { fetchToCurl } from 'fetch-to-curl';

const identResolver = process.env.IDENT_RESOLVER || 'https://graph.ident.agency';

/** @type {import('./$types').PageLoad} */
export async function load({ params, url }) {
	const subject = params.subject || currentCohort();

	const DEFAULT_PAGE_SIZE = 50;
	let pageSize = parseInt(url.searchParams.get('pageSize'), 10) || DEFAULT_PAGE_SIZE;
	if (pageSize > 100) {
		pageSize = 100;
	}
	if (pageSize < 1) {
		pageSize = DEFAULT_PAGE_SIZE;
	}
	let start = parseInt(url.searchParams.get('start'), 10) || 0;
	let prev = start > 0 ? start - pageSize : null;
	if (!prev || prev < 0) {
		prev = 0;
	}

	// NB: be careful, gql is type sensitive, so convert strings to numbers if needed
	// console.log({subject, pageSize, start, prev, params});

	const headers = {
		accept: 'application/json', // application/graphql-response+json, application/json, multipart/mixed ?
		'content-type': 'application/json'
	};

	// {"query":"query LeaderBoardQuery($start: Int, $pageSize: Int, $subject: String) {\n  leaderBoard(start: $start, pageSize: $pageSize, subject: $subject) {\n    leaderboard {\n      rows {\n        identifier\n        rank\n        score\n      }\n    }\n    status {\n      message\n      code\n    }\n  }\n}","variables":{"subject":"","pageSize":100,"start":0},"operationName":"LeaderBoardQuery","extensions":{}}

	const gqlQuery = {
		query:
			'query LeaderBoardQuery($start: Int, $pageSize: Int, $subject: String) {\n  leaderBoard(start: $start, pageSize: $pageSize, subject: $subject) {\n    leaderboard {\n      rows {\n        identifier\n        rank\n        score\n      }\n    }\n    status {\n      message\n      code\n    }\n  }\n}',
		variables: {
			subject: subject,
			pageSize: pageSize,
			start: start
		},
		operationName: 'LeaderBoardQuery',
		extensions: {}
	};
	// console.log('gqlQuery', gqlQuery);
	let results = {};
	try {
		const options = {
			headers,
			method: 'POST',
			body: JSON.stringify(gqlQuery)
		};
		// console.log(fetchToCurl(`${identResolver}/api/v1/gql`, options));
		results = await fetch(`${identResolver}/api/v1/gql`, options)
			.then(async (r) => {
				// check status code
				if (r.status !== 200) {
					// console.log('error fetching gql', r.status);
					const body = await r.text();
					// console.log('body------------------------', body);
					const json = await r.json(); // not guaranteed to be json :(
					// console.log('json2', json);
					if (json) {
						const errMsg = json.data?.LeaderBoardQuery?.status?.message || '';
						throw new Error(errMsg);
					}
					throw new Error('raw err: ' + body);
				}

				const json = await r.json();
				// console.log('json', json);
				return json;
			})
			.catch((e) => {
				console.log('error fetching gql', e);
				throw e;
			});
	} catch (e) {
		console.log('error fetching gql', e);
		// addToast({
		//   msg: 'Error submitting Kudos for Fame. Check your network connection and try again.',
		//   type: 'error',
		//   duration: 3000,
		// });
		results.status = {
			message: 'Error fetching leaderboard:' + e.message,
			code: 500
		};
		return results;
	}

	return {
		leaderboard: results?.data?.leaderBoard?.leaderboard?.rows || [],
		status: results?.status || {},
		subject: subject,
		pageSize: pageSize,
		cursor: {
			next:
				results?.data?.leaderBoard?.leaderboard?.rows?.length === pageSize
					? start + pageSize
					: null,
			prev
		}
	};

	// if (params.subject === 'hi') {
	//   return {
	//     title: 'Hello world!',
	//     content: 'Welcome to our blog. Lorem ipsum dolor sit amet adipiscing elit.'
	//   };
	// }

	// throw error(404, 'Not found');
}
