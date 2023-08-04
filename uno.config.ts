import {
	defineConfig,
	presetUno,
	presetTypography,
	presetWebFonts,
} from "unocss";
import { presetForms } from "@julr/unocss-preset-forms";

export default defineConfig({
	presets: [
		presetUno(),
		presetTypography({
			cssExtend: {
				"h1,h2,h3,h4,h5.h6": {
					"font-family": "'Poppins'",
				},
			},
		}),
		presetWebFonts(),
		presetForms(),
	],
	content: {
		pipeline: {
			include: [
				/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html|ts)($|\?)/,
			],
		},
	},
	theme: {
		colors: {
			dark: {
				"50": "#f9faf9",
				"100": "#f1f1f1",
				"200": "#dfdedf",
				"300": "#bcbbbc",
				"400": "#909291",
				"500": "#71706b",
				"600": "#5a554e",
				"700": "#443f3b",
				"800": "#2e2b29",
				"900": "#1c191a",
			},
		},
	},
});
