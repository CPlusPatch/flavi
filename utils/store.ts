import { MatrixClient } from "matrix-js-sdk";
import { createPinia, defineStore } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { MatrixMessage } from "classes/Event";
import { MatrixRoom } from "classes/Room";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export const useStore = defineStore("store", {
	state: () => {
		return {
			client: null as MatrixClient | null,
			state: {
				loaded: false,
			},
			replies: {} as {
				// Key is Room ID
				[key: string]: {
					eventId: string;
					text: string;
				};
			},
		};
	},
	persist: {
		storage: localStorage,
	},
});

export const useRoomPreviewStore = defineStore("roomPreviewStore", {
	state: () => {
		return {
			rooms: [] as {
				room: MatrixRoom;
				lastMessage: MatrixMessage | null;
			}[],
		};
	},
});
