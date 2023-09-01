<script setup lang="ts">
import { ClientEvent, MatrixClient } from "matrix-js-sdk";
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

store.client?.on(ClientEvent.Event, timelineChange);

onUnmounted(() => {
	store.client?.off(ClientEvent.Event, timelineChange);
});

timelineChange();
</script>

<template>
	<SidebarFvSidebarRoomList
		title="Direct Messages"
		:rooms="roomList as any" />
</template>
