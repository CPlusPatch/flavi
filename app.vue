<script setup lang="ts">
window.global ||= window;

import { EventEmitterEvents, IndexedDBCryptoStore, IndexedDBStore, createClient } from "matrix-js-sdk";
import { useStore } from "~/utils/store";
// import Olm from "@matrix-org/olm";
import "~/styles/index.css";
import "@unocss/reset/tailwind.css";
import EventEmitter from "events";

/* if (process.client) {
	(global as any)["Olm"] = Olm;
}
 */
const indexedDBStore = new IndexedDBStore({
	indexedDB: indexedDB,
	localStorage: localStorage,
	dbName: 'web-sync-store',
});
await indexedDBStore.startup();

const myUserId = "@jesse:cpluspatch.dev";
const matrixClient = createClient({
	baseUrl: "http://matrix.cpluspatch.dev/",
	accessToken: useRuntimeConfig().public.TOKEN,
	userId: myUserId,
	store: indexedDBStore,
	deviceId: "ANSLNBZBTY",
	cryptoStore: new IndexedDBCryptoStore(indexedDB, 'crypto-store'),
	verificationMethods: [
		'm.sas.v1',
	],
});

const store = useStore();

await matrixClient.initCrypto();
await matrixClient.startClient();
store.client = matrixClient;

await new Promise<void>(resolve => {
	matrixClient.once("sync" as any, () => {
		resolve()
	})
})

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