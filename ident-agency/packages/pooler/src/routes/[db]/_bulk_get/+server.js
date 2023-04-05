import { error } from '@sveltejs/kit';

export const POST = async ({ request, url, locals }) => {
	// https://docs.couchdb.org/en/stable/api/database/bulk-api.html#db-bulk-get

	// Request Headers
	//     Accept –
	//         application/json
	//         multipart/related
	//         multipart/mixed

	// Query Parameters
	//     revs (boolean) – Give the revisions history

	// Request JSON Object
	//     docs (array) – List of document objects, with id, and optionally rev and atts_since

	// Request: {
	//     "docs": [
	//         {
	//             "id": "foo"
	//             "rev": "4-753875d51501a6b1883a9d62b4d33f91",
	//         },
	//         {
	//             "id": "foo"
	//             "rev": "1-4a7e4ae49c4366eaed8edeaea8f784ad",
	//         },
	//         {
	//             "id": "bar",
	//         }
	//         {
	//             "id": "baz",
	//         }
	//     ]
	// }

	// response: {
	//   "results": [
	//     {
	//       "id": "foo",
	//       "docs": [
	//         {
	//           "ok": {
	//             "_id": "foo",
	//             "_rev": "4-753875d51501a6b1883a9d62b4d33f91",
	//             "value": "this is foo",
	//             "_revisions": {
	//               "start": 4,
	//               "ids": [
	//                 "753875d51501a6b1883a9d62b4d33f91",
	//                 "efc54218773c6acd910e2e97fea2a608",
	//                 "2ee767305024673cfb3f5af037cd2729",
	//                 "4a7e4ae49c4366eaed8edeaea8f784ad"
	//               ]
	//             }
	//           }
	//         }
	//       ]
	//     },...
	// }

	const input = await request.json();
	// let { new_edits, docs } = input;

	// // see if docs exists
	// if (!docs) {
	// 	throw error(400, { error: 'bad_request', reason: "missing JSON list of 'docs'" });
	// }

	// const processedDocs = [...docs];

	const body = {
		results: [{ id: 'foo' }]
	};

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
