import preprocess from "svelte-preprocess";
import staticAdapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess(),

  kit: {
    adapter: staticAdapter(),
    alias: {
      $i18n: "src/i18n",
      $lib: "src/lib",
    },
  },
};

export default config;
