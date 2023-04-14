const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				...colors,
				primaryb: '#389D61',
				primary: '#5AB06C',
				secondary: '#D2E6DA',
				tertiary: '#EEEEEE',
				quad: '#F4F3ED',
				quint: '#A7DDD8',
				sept: '#D6EAD7'
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
