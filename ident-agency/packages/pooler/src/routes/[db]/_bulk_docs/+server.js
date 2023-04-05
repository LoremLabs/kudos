import { error } from '@sveltejs/kit';

export const POST = async ({ request, url, locals, params }) => {
	// https://docs.couchdb.org/en/stable/api/database/bulk-api.html#db-bulk-docs

	// Request JSON Object
	// - docs (array) – List of documents objects
	// - new_edits (boolean) – If false, prevents the database from assigning them new revision IDs. Default is true. Optional

	// {
	//     "docs": [
	//         {
	//             "_id": "FishStew"
	//         },
	//         {
	//             "_id": "LambStew",
	//             "_rev": "2-0786321986194c92dd3b57dfbfc741ce",
	//             "_deleted": true
	//         }
	//     ]
	// }

	const { db } = params;
	if (!db) {
		// not possible?
		throw error(400, { error: 'bad_request', reason: 'missing database name' });
	}

	const input = await request.json();
	let { new_edits, docs } = input;

	// see if docs exists
	if (!docs) {
		throw error(400, { error: 'bad_request', reason: "missing JSON list of 'docs'" });
	}

	const processedDocs = [...docs];

	const body = {
		params,
		docs: processedDocs.map((doc) => {
			const { _id, _rev, _deleted } = doc;
			return {
				_id,
				_rev,
				_deleted
			};
		})
	};

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
