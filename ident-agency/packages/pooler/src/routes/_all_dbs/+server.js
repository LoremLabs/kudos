import { error } from '@sveltejs/kit';

export function GET({ request, url, locals }) {
	// https://docs.couchdb.org/en/stable/api/server/common.html#all-dbs

	// Query Parameters
	// descending (boolean) – Return the databases in descending order by key. Default is false.
	// endkey (json) – Stop returning databases when the specified key is reached.
	// end_key (json) – Alias for endkey param
	// limit (number) – Limit the number of the returned databases to the specified number.
	// skip (number) – Skip this number of databases before starting to return the results. Default is 0.
	// startkey (json) – Return databases starting with the specified key.
	// start_key (json) – Alias for startkey.

	//     HTTP/1.1 200 OK
	// Cache-Control: must-revalidate
	// Content-Length: 52
	// Content-Type: application/json
	// Date: Sat, 10 Aug 2013 06:57:48 GMT
	// Server: CouchDB (Erlang/OTP)

	// [
	//    "_users",
	//    "contacts",
	//    "docs",
	//    "invoices",
	//    "locations"
	// ]

	// TODO: get from storage layer?
	const dbs = ['_users', 'contacts'];

	const body = dbs;

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			// 'Content-Type': 'application/json',
		}
	});
}
