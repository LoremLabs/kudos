const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  plugins: {
    autoprefixer: {},
    tailwindcss: {
      mode: "jit",
      purge: ["./src/**/*.html", "./src/**/*.svelte"],
      plugins: [
        require("@tailwindcss/forms"),
        require("@tailwindcss/aspect-ratio"),
      ],
      theme: {
        extend: {
          fontFamily: {
            sans: ["Inter var", ...defaultTheme.fontFamily.sans],
          },
        },
      },
    },
  },
};
