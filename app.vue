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

const indexedDBStore = new IndexedDBStore({
	indexedDB,
	localStorage,
	dbName: "web-sync-store",
});
const cryptoStore = new IndexedDBCryptoStore(indexedDB, "crypto-store");
await indexedDBStore.startup();

checkLocalStorage();

const matrixClient = createClient({
	baseUrl: localStorage.getItem("homeserver") ?? "https://matrix.cpluspatch.dev/",
	accessToken: localStorage.getItem("token") ?? "",
	userId: localStorage.getItem("user_id") ?? "@jesse:cpluspatch.dev",
	store: indexedDBStore,
	deviceId: localStorage.getItem("device_id") ?? "YXJHRPITMU",
	cryptoStore,
	verificationMethods: [verificationMethods.SAS],
	timelineSupport: true,
});

const store = useStore();

await matrixClient.initCrypto();
await matrixClient.startClient();
matrixClient.setGlobalErrorOnUnknownDevices(false);
store.client = matrixClient;

await new Promise<void>(resolve => {
	matrixClient.once(ClientEvent.Sync, () => {
		resolve();
	});
});

matrixClient.on(CryptoEvent.VerificationRequest, async request => {
	await request.accept();

	const verifier = request.beginKeyVerification(verificationMethods.SAS);

	verifier.on(VerifierEvent.ShowSas, async sasData => {
		await sasData.confirm();
	});

	await verifier.verify();
});

/* const keys = await decryptMegolmKeyFile(await (await fetch("/dakey.txt")).arrayBuffer(), "test");

store.client?.importRoomKeys(JSON.parse(keys)).then(() => {
	alert("done");
}); */
</script>

<template>
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
