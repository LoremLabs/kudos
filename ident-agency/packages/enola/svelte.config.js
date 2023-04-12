//import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			runtime: 'nodejs18.x' // edge?
		}),
		alias: {
			$lib: 'src/lib',
			$static: 'static',
			$templates: 'static/templates' // TODO: Vercel/SvelteKit workaround
		}
	}
};

export default config;
