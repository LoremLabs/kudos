import adapter from 'sveltekit-adapter-chrome-extension';
//import { vitePreprocess } from '@sveltejs/kit/vite';
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter({
			// default options are shown
			pages: 'build',
			assets: 'build',
			fallback: null,
			precompress: false,
			manifest: 'manifest.json',
			// emptyOutDir: true
		}),
		appDir: 'app',
		alias: {
			$lib: 'src/lib',
			$static: 'static'
		},
				  
	}
};

export default config;
