<script setup lang="ts">
import * as sdk from "matrix-js-sdk";
const myUserId = "@jesse:cpluspatch.dev";
const myAccessToken = process.env.TOKEN;
const matrixClient = sdk.createClient({
	baseUrl: "http://matrix.cpluspatch.dev",
	accessToken: myAccessToken,
	userId: myUserId,
});

console.log(matrixClient.baseUrl);
</script>

<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>
