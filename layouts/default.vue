<script setup lang="ts">
import { MatrixClient, RoomEvent } from "matrix-js-sdk";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";
const store = useStore();

const client = store.client;
const roomList = ref<MatrixRoom[]>([]);
const spaces = ref<MatrixRoom[]>([]);

if (!client) throw createError("Client not working!");

const timelineChange = async () => {
	// Get rooms based on last event date
	const rooms = (
		((await store.client?.getJoinedRooms())?.joined_rooms
			.map(
				roomId =>
					client.getRoom(roomId) &&
					new MatrixRoom(roomId, client as MatrixClient)
			)
			.filter(a => a) as MatrixRoom[]) ?? []
	).toSorted(
		(a, b) =>
			b.getLastMessageDate().getTime() - a.getLastMessageDate().getTime()
	);
	roomList.value = rooms.filter(r => !r.isSpace());
	spaces.value = rooms.filter(r => r.isSpace());
};

store.client?.on(RoomEvent.Timeline, timelineChange);

onUnmounted(() => {
	store.client?.off(RoomEvent.Timeline, timelineChange);
});

await timelineChange();
</script>

<template>
	<div
		class="max-w-full w-full h-screen bg-dark-800 flex flex-row divide-gray-400 p-0 overflow-hidden font-inter">
		<div
			class="w-16 bg-dark-950 shrink-0 md:flex flex-col items-center py-2 gap-3 hidden">
			<div
				class="h-10 w-10 rounded-md flex items-center ring-dark-600 hover:ring-1 bg-dark-800 duration-200 rounded hover:shadow-xl justify-center shrink-0 text-orange-100">
				<Icon name="tabler:message" class="w-6 h-6" />
			</div>
			<SeparatorsFvSeparator />
			<TransitionGroup move-class="duration-200 transition-all">
				<div
					v-for="space of spaces"
					:key="space.id"
					class="h-10 w-10 hover:translate-x-1 duration-200 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow">
					<img
						:src="
							space.getAvatarUrl() ??
							`https://api.dicebear.com/6.x/initials/svg?seed=${space.getName()}&chars=1`
						"
						class="w-full h-full object-cover" />
				</div>
			</TransitionGroup>
		</div>
		<div
			class="bg-dark-900 p-1 md:flex flex-col gap-1 overflow-x-hidden no-scrollbar overflow-y-scroll relative w-60 shrink-0 hidden">
			<TransitionGroup move-class="duration-200 transition-all">
				<PreviewsFvRoomPreview
					v-for="room of roomList"
					:key="room.id"
					:room="(room as any)" />
			</TransitionGroup>
		</div>
		<slot />
	</div>
</template>
