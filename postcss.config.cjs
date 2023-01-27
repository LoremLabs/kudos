const defaultTheme = require("tailwindcss/defaultTheme");

// add tailwind colors to svelte config
const colors = require("tailwindcss/colors");

module.exports = {
  plugins: {
    autoprefixer: {},
    tailwindcss: {
      mode: "jit",

      purge: ["./src/**/*.html", "./src/**/*.svelte"],
      plugins: [
        require("@tailwindcss/forms"),
        require("@tailwindcss/aspect-ratio"),
        require('tailwindcss-font-inter')({
          importFontFace: true,
        }),
      ],
      theme: {
        extend: {
          colors: {
            ...colors,
          },
          fontFamily: {
            sans: ["Inter var", ...defaultTheme.fontFamily.sans],
          },
        },
      },
    },
  },
};
