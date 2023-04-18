const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				...colors,
				primary: '#389D61',
				primarya: '#5AB06C',
				secondary: '#D2E6DA',
				tertiary: '#EEEEEE',
				quad: '#F4F3ED',
				quint: '#A7DDD8',
				sept: '#D6EAD7'
			},
			fontFamily: {
				heading: ['tt-firs-neu', 'sans-serif'],
				action: ['tt-firs-neu', 'sans-serif']
			},
			fontSize: {
				xxxs: '.5rem',
				xxs: '.6rem'
			}
		}
	},
	plugins: [
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
		require('@tailwindcss/aspect-ratio')
	]
};
