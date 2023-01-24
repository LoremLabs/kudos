import * as process from "process";

// import { Buffer } from 'buffer/'
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
      define: { "process.env.var": "hi" }, // inject will override define, to keep env vars you must also pass define here https://github.com/evanw/esbuild/issues/660
    }),
    sveltekit(),
    topLevelAwait(),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  define: {
    global: {},
    process
  },
  //   //    Buffer,
  //   // process: {
  //   //   getNextTick: () => {},
  //   //   env: {
  //   //     // this is required for the `crypto` module to work
  //   //   }
  //   // }
  // },
  build: {
    // Tauri supports es2021
    target: ["es2021", "chrome100", "safari13"],
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
        inject: ['./src/utils/buffer-shim.js'],
      // plugins: [
      //   NodeGlobalsPolyfillPlugin({
      //     process: true,
      //     buffer: true,
      //   }),
      // ],
    },
  },
});
