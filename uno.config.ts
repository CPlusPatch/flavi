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
				"50": "#F3F5FF",
				"100": "#D3D8ED",
				"200": "#AFB7D4",
				"300": "#8A94B5",
				"400": "#5C6483",
				"500": "#3E455E",
				"600": "#30354B",
				"700": "#222739",
				"800": "#161926",
				"900": "#0B0D14",
			},
			accent: {
				"50": "#CCC9FF",
				"100": "#B2AEED",
				"200": "#9490D4",
				"300": "#7571B5",
				"400": "#524C83",
				"500": "#39335E",
				"600": "#2D254B",
				"700": "#211A39",
				"800": "#161026",
				"900": "#0B0714",
			},
		},
	},
});
