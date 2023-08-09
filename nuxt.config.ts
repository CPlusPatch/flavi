import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: [
		"@unocss/nuxt",
		"nuxt-headlessui",
		"nuxt-icon",
		"@vueuse/nuxt",
		"@pinia/nuxt",
		"nuxt-twemoji",
		"@vite-pwa/nuxt",
	],
	spaLoadingTemplate: false,
	ssr: false,
	vite: {
		plugins: [
			nodePolyfills({
				// To exclude specific polyfills, add them to this list.
				exclude: [
					"fs", // Excludes the polyfill for `fs` and `node:fs`.
				],
				// Whether to polyfill `node:` protocol imports.
				protocolImports: true,
			}),
			wasm(),
		],
	},
	runtimeConfig: {
		public: {
			TOKEN: process.env.TOKEN,
		},
	},
	app: {
		head: {
			script: [
				{
					hid: "matrix-olm",
					src: "/olm.js",
					defer: false,
				},
			],
		},
		pageTransition: {
			mode: "out-in",
			name: "page",
		},
	},
	pwa: {
		registerType: "autoUpdate",
		manifest: {
			name: "Flavi",
			short_name: "Flavi",
			display: "standalone",
			orientation: "portrait",
			scope: "/",
			start_url: "/",
		},
	},
});
