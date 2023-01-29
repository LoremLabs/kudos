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
        require("tailwindcss-font-inter")({
          importFontFace: true,
        }),
      ],
      theme: {
        extend: {
          animation: {
            "fade-in": "fade-in 0.5s linear forwards",
            marquee: "marquee var(--marquee-duration) linear infinite",
            "spin-slow": "spin 4s linear infinite",
            "spin-slower": "spin 6s linear infinite",
            "spin-reverse": "spin-reverse 1s linear infinite",
            "spin-reverse-slow": "spin-reverse 4s linear infinite",
            "spin-reverse-slower": "spin-reverse 6s linear infinite",
          },
          keyframes: {
            "fade-in": {
              from: {
                opacity: 0,
              },
              to: {
                opacity: 1,
              },
            },
            marquee: {
              "100%": {
                transform: "translateY(-50%)",
              },
            },
            "spin-reverse": {
              to: {
                transform: "rotate(-360deg)",
              },
            },
          },
          colors: {
            ...colors,
            primary: colors.fuchsia,
          },
          fontFamily: {
            sans: ["Inter var", ...defaultTheme.fontFamily.sans],
          },
        },
      },
    },
  },
};
