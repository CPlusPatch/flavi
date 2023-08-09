<script setup lang="ts">
import { ButtonHTMLAttributes } from "nuxt/dist/app/compat/capi";
import Spinner from "../spinner/Spinner.vue";

const themes: { [key: string]: string } = {
	gray: "text-gray-200 !bg-accent-800 ring-1 ring-inset ring-gray-700 hover:bg-accent-600 outline-none",
	accent: "!bg-accent-600 hover:!bg-accent-700 text-white border-transparent",
	accentLight:
		"text-accent-700 dark:text-accent-200 !bg-accent-100 dark:bg-accent-800 hover:bg-accent-200 border-transparent",
	transparentIcon: "text-accent-50 !bg-transparent hover:!bg-accent-700",
};

interface ButtonProps extends /* @vue-ignore */ ButtonHTMLAttributes {
	theme?: "gray" | "accent" | "accentLight" | "transparentIcon";
	loading?: boolean;
	spinnerClasses?: string;
	disabled?: boolean;
}

defineProps<ButtonProps>();
</script>

<template>
	<button
		:class="[
			'inline-flex justify-center relative ease-in-out items-center outline-none no-bad-scale rounded-md px-3 py-1.5 text-sm font-semibold leading-6 shadow-sm duration-200 font-inter focus:outline-none',
			theme && themes[theme],
			loading && '!text-transparent',
		]"
		:disabled="disabled || loading"
		type="button">
		<Spinner
			v-if="loading"
			:theme="theme"
			:class="[spinnerClasses, 'absolute']" />
		<slot />
	</button>
</template>
