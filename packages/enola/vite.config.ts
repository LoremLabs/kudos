import type { UserConfig } from 'vite';
import { gql } from './src/lib/vite/gql-plugin';
import { sveltekit } from '@sveltejs/kit/vite';

const config: UserConfig = {
	plugins: [sveltekit(), gql()]
};

export default config;
