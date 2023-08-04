<script setup lang="ts">
import { MatrixClient, RoomEvent } from "matrix-js-sdk";
import { MatrixMessage } from "~/classes/Event";
import { MatrixRoom } from "~/classes/Room";
import { useStore } from "~/utils/store";

const store = useStore();

const roomList = ref<
	{
		room: MatrixRoom;
		lastMessage: MatrixMessage | null;
	}[]
>([]);

const timelineChange = async () => {
	// Get rooms based on last event date
	const rooms = (
		((await store.client?.getJoinedRooms())?.joined_rooms
			.map(
				roomId =>
					store.client?.getRoom(roomId) &&
					new MatrixRoom(roomId, store.client as MatrixClient)
			)
			.filter(a => a) as MatrixRoom[]) ?? []
	).toSorted(
		(a, b) =>
			b.getLastMessageDate().getTime() - a.getLastMessageDate().getTime()
	);
	roomList.value = rooms
		.filter(r => !r.isSpace())
		.filter(r => r.isDirectMessage())
		.map(room => ({
			room: room as MatrixRoom,
			lastMessage: room.getLastTextMessage(),
		}));
};

store.client?.on(RoomEvent.Timeline, timelineChange);
store.client?.on(RoomEvent.Receipt, timelineChange);

onUnmounted(() => {
	store.client?.off(RoomEvent.Timeline, timelineChange);
	store.client?.off(RoomEvent.Receipt, timelineChange);
});

timelineChange();
</script>

<template>
	<div class="w-full py-3 px-3 border-b border-dark-800">
		<h1 class="font-semibold text-lg text-white">Direct Messages</h1>
	</div>
	<div
		class="p-1 flex-col gap-1 flex no-scrollbar overflow-y-scroll overflow-x-hidden">
		<TransitionGroup
			v-if="roomList.length > 0"
			move-class="duration-200 transition-all">
			<PreviewsFvRoomPreview
				v-for="{ room, lastMessage } of roomList"
				:key="room.id"
				:room="(room as any)"
				:last-message="(lastMessage as any)" />
		</TransitionGroup>
		<PreviewsFvRoomPreviewSkeleton v-for="i of 15" v-else :key="i" />
	</div>
</template>
