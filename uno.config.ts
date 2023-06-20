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
				"50": "#f7f7f6",
				"100": "#e5e4e2",
				"200": "#cbc9c4",
				"300": "#a9a79f",
				"400": "#86857b",
				"500": "#6b6a61",
				"600": "#55544c",
				"700": "#46453f",
				"800": "#3a3a35",
				"900": "#32322f",
				"950": "#262622",
			},
		},
	},
});
