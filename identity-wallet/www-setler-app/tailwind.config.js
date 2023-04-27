const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				...colors,
				primaryc: '#81C898',
				primary: '#EFBE56',
				primaryb: '#EE7D60',
				primarya: '#5AB06C',
				secondary: '#A7D691',
				tertiary: '#EEEEEE',
				quad: '#fefefe',
				quint: '#F5ECFA',
				sept: '#F5ffff',
				logo: '#8F389D'
			},
			fontFamily: {
				logo: ['holtwoodonesc', 'sans-serif'],
				heading: ['roboto-mono', 'sans-serif'],
				action: ['roboto-mono', 'sans-serif']
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
