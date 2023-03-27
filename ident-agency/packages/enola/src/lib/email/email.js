import Mailgun from 'mailgun.js';
import Maizzle from '@maizzle/framework';
// TODO: Vercel/SvelteKit workaround https://github.com/sveltejs/kit/issues/5999
import authLink01 from '$templates/auth-link-01.tmpl?raw';
import formData from 'form-data';
import log from '$lib/logging';
import tailwindConfig from './tailwind.config.js';

// import welcome01 from '$templates/welcome-01.tmpl?raw';

const mailgun = new Mailgun(formData);

const BRAND_MAIL_DOMAIN = 'notify.ident.agency';
// const BRAND_NAME = 'Send to Social';

let mg;

export const sendEmail = async (msg) => {
	mg ??= mailgun.client({
		username: 'api',
		key: process.env.MAILGUN_PRIVATE
	});

	try {
		const res = await mg.messages.create(BRAND_MAIL_DOMAIN, msg);
		return res;
	} catch (error) {
		log.error('mg error', { error });
		throw error;
	}
};

export const composeEmail = async ({ template, options }) => {
	//   const emailTemplate = fs.readFileSync(
	//     path.resolve(`src/templates/${template}.tmpl`),
	//     'utf8'
	//   ); // throw error if file doesn't exist
	let emailTemplate = authLink01; // TODO: Vercel/SvelteKit workaround

	// TODO: use options.tags and g_a,b,c,d to select subTemplate if it exists

	// switch to select emailTemplate
	switch (template) {
		case 'auth-link-01':
			emailTemplate = authLink01;
			break;
		// case 'magic-link-01':
		//   emailTemplate = magicLink01;
		//   break;
		// case 'welcome-01':
		//   emailTemplate = welcome01;
		//   break;
		default:
			emailTemplate = authLink01;
	}

	const renderOptions = {
		tailwind: {
			config: tailwindConfig
		},
		maizzle: {
			inlineCSS: true,
			removeUnusedCSS: true,
			minify: true,
			prettify: true,
			baseURL: options.baseURL || 'https://graph.ident.agency/',
			locals: {
				...options.locals
			}
		},
		// beforeRender() {},
		// afterRender() {},
		// afterTransformers() {},
		...options
	};
	//   console.log('renderOptions', renderOptions.maizzle);

	const rendered = await Maizzle.render(emailTemplate, renderOptions);
	return rendered;
};
