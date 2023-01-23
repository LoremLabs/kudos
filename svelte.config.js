import preprocess from "svelte-preprocess";
import staticAdapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess(),

  kit: {
    // prerender: {
    //   entries: ["/", "/collection"],
    // },
    adapter: staticAdapter({
      fallback: "index.html",
    }),
    alias: {
      $i18n: "src/i18n",
      $lib: "src/lib",
      $styles: "src/styles",
    },
  },
};

export default config;
