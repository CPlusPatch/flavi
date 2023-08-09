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
		.filter(r => !r.isDirectMessage())
		.filter(r => r.isOrphan())
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
	<SidebarFvSidebarRoomList title="Rooms" :rooms="(roomList as any)" />
</template>
