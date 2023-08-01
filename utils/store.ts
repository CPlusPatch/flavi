import { MatrixClient } from "matrix-js-sdk";
import { createPinia, defineStore } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export const useStore = defineStore("store", {
	state: () => {
		return {
			client: null as MatrixClient | null,
		};
	},
	persist: {
		storage: localStorage,
	},
});
