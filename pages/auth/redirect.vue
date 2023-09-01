<script setup lang="ts">
import { createClient } from "matrix-js-sdk";

const homeserver = localStorage.getItem("homeserver");
const token = useRoute().query.loginToken as string;

const client = createClient({
	baseUrl: homeserver ?? "",
});

try {
	const session = await client.login("m.login.token", {
		token,
		initial_device_display_name: "Flavi Web",
	});

	localStorage.setItem("homeserver", client.baseUrl);
	localStorage.setItem("token", session.access_token);
	localStorage.setItem("user_id", session.user_id);
	localStorage.setItem("device_id", session.device_id);
	window.location.replace("/");
} catch (e) {
	console.error(e);
	alert(`Error occured. Please check console for more information`);
}

definePageMeta({
	layout: "auth",
});
</script>

<template>
	<div
		class="flex min-h-screen w-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-accent-900">
		<div class="sm:mx-auto sm:w-full sm:max-w-sm">
			<h2
				class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-50">
				Signing you in...
			</h2>
		</div>
	</div>
</template>
