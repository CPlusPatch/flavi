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
	rules: [
		// Match bg-accent-xxx to the a theme CSS variable (background color)
		// e.g. bg-accent-500 -> --theme-bg-accent-500
		[
			/^bg-accent-(\d+)$/,
			([, d]) => ({
				"background-color": `var(--theme-bg-accent-${d})`,
			}),
		],
		[
			/^fill-accent-(\d+)$/,
			([, d]) => ({
				fill: `var(--theme-bg-accent-${d})`,
			}),
		],
		[
			/^ring-accent-(\d+)$/,
			([, d]) => ({
				"--un-ring-color": `var(--theme-bg-accent-${d})`,
			}),
		],
		[
			/^border-accent-(\d+)$/,
			([, d]) => ({
				"border-color": `var(--theme-bg-accent-${d})`,
			}),
		],
		// Do the same for text-color
		[
			/^text-accent-(\d+)$/,
			([, d]) => ({
				color: `var(--theme-color-accent-${d})`,
			}),
		],
	],
	content: {
		pipeline: {
			include: [
				/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html|ts)($|\?)/,
			],
		},
	},
});
