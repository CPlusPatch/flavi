<script setup lang="ts">
import {
	IndexedDBCryptoStore,
	IndexedDBStore,
	createClient,
} from "matrix-js-sdk";
import "~/styles/index.css";
import "@unocss/reset/tailwind.css";
import { verificationMethods } from "matrix-js-sdk/lib/crypto";
import { sha256Hash } from "./utils/crypto";
import { useStore } from "~/utils/store";

window.global ||= window;

document
	.getElementsByTagName("html")[0]
	.classList.add("theme-color-darkblue", "theme-bg-dark");

const location = window.location;

const userId = useLocalStorage("userId", "");
const users = useLocalStorage<
	{
		id: string;
		avatar: string;
		name: string;
		accessToken: string;
		baseUrl: string;
		deviceId: string;
	}[]
>("users", []);
const currentUser = computed(
	() => users.value.find(u => u.id === userId.value) || null
);

const isClientLoaded = ref(false);

const store = useStore();
store.state.loaded = false;

watch(
	() => currentUser.value?.id,
	async () => {
		if (currentUser.value) {
			const userHash = await sha256Hash(currentUser.value.id);
			isClientLoaded.value = false;
			await nextTick();

			// Initialize IndexedDB stores
			const indexedDBStore = new IndexedDBStore({
				indexedDB,
				localStorage,
				dbName: `${userHash}-web-sync-store`,
			});
			const cryptoStore = new IndexedDBCryptoStore(
				indexedDB,
				`${userHash}-crypto-store`
			);
			await indexedDBStore.startup();

			// Create Matrix client
			const matrixClient = createClient({
				baseUrl: currentUser.value.baseUrl,
				accessToken: currentUser.value.accessToken,
				userId: currentUser.value.id,
				store: indexedDBStore,
				deviceId: currentUser.value.deviceId,
				cryptoStore,
				verificationMethods: [verificationMethods.SAS],
				timelineSupport: true,
			});

			// Initialize and start Matrix client
			await matrixClient.initCrypto();
			await matrixClient.startClient();
			matrixClient.setGlobalErrorOnUnknownDevices(false);
			store.client = matrixClient;

			isClientLoaded.value = true;

			if (window.location.pathname !== "/") {
				window.location.href = "/";
			}
		} else {
			store.state.loaded = true;
		}
	},
	{
		immediate: true,
	}
);

if (users.value.length > 0) {
	userId.value = users.value[0].id;
}
</script>

<template>
	<NotificationsFvNotifier />
	<LightboxFvLightbox />
	<UsersFvUserViewer />
	<div id="root" class="theme-color-darkorange theme-bg-dark dark">
		<NuxtLayout
			v-if="
				(currentUser && isClientLoaded) ||
				location.pathname == '/auth/redirect'
			">
			<NuxtPage />
		</NuxtLayout>
		<Login v-else-if="!currentUser" />
		<div
			v-if="!store.state.loaded"
			class="bg-accent-900 fixed z-100 inset-0 flex h-full w-full items-center justify-center">
			<div class="flex flex-col gap-5 items-center">
				<Spinner theme="accentDark" class="!w-10 !h-10" />
				<h1 class="font-semibold text-gray-200 text-sm">
					Initializing Flavi
				</h1>
			</div>
		</div>
		<VitePwaManifest />
	</div>
</template>

<style>
.page-enter-active,
.page-leave-active {
	transition: all 0.2s ease-in-out;
}
.page-enter-from,
.page-leave-to {
	opacity: 0;
}
</style>
