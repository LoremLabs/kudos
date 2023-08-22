const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				...colors,
				primary: '#4E26DE',
				primarya: '#5AB06C',
				secondary: '#FAD471',
				tertiary: '#ECE7D7',
				quad: '#F7F7F8',
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
