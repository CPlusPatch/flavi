<script setup lang="ts">
import { MatrixClient } from "matrix-js-sdk";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";
import { MatrixUser } from "~/classes/User";
const store = useStore();

const client = store.client;
const roomList = ref<MatrixRoom[]>([]);
const spaces = ref<MatrixRoom[]>([]);

if (!client) throw createError("Client not working!");

watch(async () => await store.client?.getJoinedRooms(), async (rooms) => {
	roomList.value = ((await rooms)?.joined_rooms.map(roomId => client.getRoom(roomId) && new MatrixRoom(roomId, client as MatrixClient)).filter(a => a) as MatrixRoom[]) ?? [];
	spaces.value = roomList.value.filter(r => r.isSpace()) ?? [];
}, {
	immediate: true,
});

const avatar = store.client?.getUserId() && new MatrixUser(store.client?.getUserId()!, store.client as MatrixClient).getAvatarUrl();
</script>

<template>
	<div class="max-w-full w-full h-screen bg-dark-800 flex flex-row divide-gray-400 p-0 overflow-hidden font-inter">
		<div class="w-16 bg-dark-950 shrink-0 flex flex-col items-center py-2 gap-3">
			<div v-for="space of spaces" :key="space.id" class="h-10 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow">
				<img :src="space.getAvatarUrl() ?? `https://api.dicebear.com/6.x/initials/svg?seed=${space.getName()}&fontWeight=600`" class="w-full h-full object-cover" />
			</div>
		</div>
		<div class="bg-dark-900 p-3 flex flex-col gap-4 overflow-x-hidden overflow-y-scroll relative w-80 shrink-0">
			<PreviewsFvRoomPreview v-for="room of roomList.sort((a, b) => b.getLastMessageDate().getTime() - a.getLastMessageDate().getTime())" :key="room.id" :room="(room as any)" />
		</div>
		<div class="grow flex overflow-x-hidden">
			
			<slot />
		</div>
		<div class="bg-dark-900 w-70 h-full p-3 shrink-0">
			<h3 class="text-gray-100 text-lg font-semibold">Members</h3>

		</div>
	</div>
</template>