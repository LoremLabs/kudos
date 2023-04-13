import { redirect } from '@sveltejs/kit';

const faviconSourceDirectory = './favicons';

const MAX_FAVICONS = 29; // change this if you add another

export function GET({ url }) {
	// see if url has a query param for favicon=01
	let favicon = url.searchParams.get('favicon') || 15;

	if (!favicon) {
		// choose a random favicon from the source directory
		const randomNumber = Math.floor(Math.random() * MAX_FAVICONS) + 1;

		// get the favicon filename-01.png a two digit number
		favicon = randomNumber < 10 ? `favicon-0${randomNumber}.png` : `favicon-${randomNumber}.png`;
	} else {
		// favicon is an int convert to filename, adding a 0 for under 10
		favicon = favicon < 10 ? `favicon-0${favicon}.png` : `favicon-${favicon}.png`;
	}

	throw redirect(302, `${url.origin}/favicons/${favicon}`);
}
