<script setup lang="ts">
import {
	ClientEvent,
	CryptoEvent,
	IndexedDBCryptoStore,
	IndexedDBStore,
	createClient,
} from "matrix-js-sdk";
import "~/styles/index.css";
import "@unocss/reset/tailwind.css";
import { VerifierEvent } from "matrix-js-sdk/lib/crypto-api";
import { verificationMethods } from "matrix-js-sdk/lib/crypto";
import { useStore } from "~/utils/store";

window.global ||= window;

// Initialize IndexedDB stores
const indexedDBStore = new IndexedDBStore({
	indexedDB,
	localStorage,
	dbName: "web-sync-store",
});
const cryptoStore = new IndexedDBCryptoStore(indexedDB, "crypto-store");
await indexedDBStore.startup();

checkLocalStorage();

// Create Matrix client
const matrixClient = createClient({
	baseUrl:
		localStorage.getItem("homeserver") ?? "https://matrix.cpluspatch.dev/",
	accessToken: localStorage.getItem("token") ?? "",
	userId: localStorage.getItem("user_id") ?? "@jesse:cpluspatch.dev",
	store: indexedDBStore,
	deviceId: localStorage.getItem("device_id") ?? "YXJHRPITMU",
	cryptoStore,
	verificationMethods: [verificationMethods.SAS],
	timelineSupport: true,
});

const store = useStore();
store.state.loaded = false;

// Initialize and start Matrix client
await matrixClient.initCrypto();
await matrixClient.startClient();
matrixClient.setGlobalErrorOnUnknownDevices(false);
store.client = matrixClient;

// Wait for initial sync
await new Promise<void>(resolve => {
	matrixClient.once(ClientEvent.Sync, () => {
		resolve();
	});
});

// Handle verification requests
matrixClient.on(CryptoEvent.VerificationRequest, async request => {
	await request.accept();
	const verifier = request.beginKeyVerification(verificationMethods.SAS);
	verifier.on(VerifierEvent.ShowSas, async sasData => {
		await sasData.confirm();
	});
	await verifier.verify();
});

// Wait until page is initialized
await nextTick();
</script>

<template>
	<div
		v-if="!store.state.loaded"
		class="bg-dark-900 fixed z-100 inset-0 flex h-full w-full items-center justify-center">
		<div class="flex flex-col gap-5 items-center">
			<Spinner theme="orangeDark" class="!w-10 !h-10" />
			<h1 class="font-semibold text-gray-200 text-sm">
				Initializing Flavi
			</h1>
		</div>
	</div>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<style>
.page-enter-active,
.page-leave-active {
	transition: all 0.2s ease-in-out;
}
.page-enter-from,
.page-leave-to {
	opacity: 0;
	transform: translateY(10px);
}
</style>
