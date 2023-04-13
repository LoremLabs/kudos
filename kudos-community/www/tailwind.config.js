const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				...colors,
				primary: '#389D61',
				secondary: '#D2E6DA',
				tertiary: '#EEEEEE',
				quad: '#F4F3ED',
				quint: '#A7DDD8'
			},
			fontFamily: {
				heading: ['ttfirstneu-sample', 'sans-serif']
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
		require('@tailwindcss/aspect-ratio')
	]
};
