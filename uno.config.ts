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
				"50": "#fafafa",
				"100": "#f4f4f5",
				"200": "#e4e4e7",
				"300": "#d4d4d8",
				"400": "#a1a1aa",
				"500": "#71717a",
				"600": "#52525b",
				"700": "#3f3f46",
				"800": "#27272a",
				"900": "#18181b",
				"950": "#09090b",
			},
		},
	},
});
