import { error } from '@sveltejs/kit';

export const GET = async ({ request, url, locals }) => {
	// get keys from query params
	let keys = url.searchParams.get('keys') || '';
	if (typeof keys === 'string') {
		keys = keys.split(',');
	}

	const offset = url.searchParams.get('offset') || 0;

	return await handler({ request, url, locals, keys, offset });
};

export const POST = async ({ request, url, locals }) => {
	const input = await request.json();
	let { keys } = input;

	if (typeof keys === 'string') {
		keys = keys.split(',');
	}

	const offset = url.searchParams.get('offset') || 0;
	// console.log({keys, offset, input});
	return await handler({ request, url, locals, keys, offset });
};

const handler = async ({ request, url, locals, keys, offset }) => {
	// https://docs.couchdb.org/en/stable/api/database/bulk-api.html

	// HTTP/1.1 200 OK
	// Cache-Control: must-revalidate
	// Content-Type: application/json
	// Date: Sat, 10 Aug 2013 16:22:56 GMT
	// ETag: "1W2DJUZFZSZD9K78UFA3GZWB4"
	// Server: CouchDB (Erlang/OTP)
	// Transfer-Encoding: chunked

	// {
	//     "offset": 0,
	//     "rows": [
	//         {
	//             "id": "16e458537602f5ef2a710089dffd9453",
	//             "key": "16e458537602f5ef2a710089dffd9453",
	//             "value": {
	//                 "rev": "1-967a00dff5e02add41819138abb3284d"
	//             }
	//         },
	//         {
	//             "id": "a4c51cdfa2069f3e905c431114001aff",
	//             "key": "a4c51cdfa2069f3e905c431114001aff",
	//             "value": {
	//                 "rev": "1-967a00dff5e02add41819138abb3284d"
	//             }
	//         },
	//         {
	//             "id": "a4c51cdfa2069f3e905c4311140034aa",
	//             "key": "a4c51cdfa2069f3e905c4311140034aa",
	//             "value": {
	//                 "rev": "5-6182c9c954200ab5e3c6bd5e76a1549f"
	//             }
	//         },
	//         {
	//             "id": "a4c51cdfa2069f3e905c431114003597",
	//             "key": "a4c51cdfa2069f3e905c431114003597",
	//             "value": {
	//                 "rev": "2-7051cbe5c8faecd085a3fa619e6e6337"
	//             }
	//         },
	//         {
	//             "id": "f4ca7773ddea715afebc4b4b15d4f0b3",
	//             "key": "f4ca7773ddea715afebc4b4b15d4f0b3",
	//             "value": {
	//                 "rev": "2-7051cbe5c8faecd085a3fa619e6e6337"
	//             }
	//         }
	//     ],
	//     "total_rows": 5
	// }

	// TODO: get from storage layer?

	let rows = [];
	rows.push({
		id: 'f4ca7773ddea715afebc4b4b15d4f0b3',
		key: 'f4ca7773ddea715afebc4b4b15d4f0b3',
		value: {
			rev: '2-7051cbe5c8faecd085a3fa619e6e6337'
		}
	});
	if (keys) {
		// filter rows by keys
		rows = rows.filter((row) => keys.includes(row.key));
	}

	const body = {
		offset,
		rows,
		total_rows: rows.length
	};

	if (keys && rows.length === 0) {
		// throw error(404, 'Not Found');
		return new Response(JSON.stringify({ status: 404, statusText: 'Not Found' }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
};
