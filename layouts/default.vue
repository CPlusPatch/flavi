<script setup lang="ts">
import { MatrixClient } from "matrix-js-sdk";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";
const store = useStore();

const client = store.client;
const roomList = ref<MatrixRoom[]>([]);

if (!client) throw createError("Client not working!");

watch(async () => await store.client?.getJoinedRooms(), async (rooms) => {
	roomList.value = ((await rooms)?.joined_rooms.map(roomId => client.getRoom(roomId) && new MatrixRoom(roomId, client as MatrixClient)).filter(a => a) as MatrixRoom[]) ?? [];
}, {
	immediate: true,
})
</script>

<template>
	<div class="max-w-full w-full h-screen bg-dark-800 flex flex-row divide-gray-400 p-0 overflow-hidden font-inter">
		<div class="w-20 bg-dark-950 shrink-0">
		</div>
		<div class="bg-dark-900 p-3 flex flex-col gap-4 overflow-x-hidden overflow-y-scroll w-80 shrink-0">
			<PreviewsFvRoomPreview v-for="room of roomList" :key="room.id" :room="(room as any)" />
		</div>
		<div class="grow flex overflow-x-hidden">
			
			<slot />
		</div>
		<div class="bg-dark-900 w-70 h-full p-3 shrink-0">
			<h3 class="text-gray-100 text-lg font-semibold">Members</h3>

		</div>
	</div>
</template>