<script setup lang="ts">
import { MatrixClient, RoomEvent } from "matrix-js-sdk";
import { MatrixMessage } from "~/classes/Event";
import { MatrixRoom } from "~/classes/Room";
import { useStore } from "~/utils/store";

const props = defineProps<{
	space: MatrixRoom;
}>();

const store = useStore();

const roomList = ref<
	{
		room: MatrixRoom;
		lastMessage: MatrixMessage | null;
	}[]
>([]);

const timelineChange = () => {
	// Get rooms based on last event date
	const rooms: MatrixRoom[] =
		(props.space
			.getSpaceChildren()
			?.map(child => {
				try {
					return new MatrixRoom(
						child ?? "",
						store.client as MatrixClient
					);
				} catch {
					return null;
				}
			})
			.filter(i => i) as any) ?? [];

	roomList.value = rooms
		.filter(r => !r.isSpace())
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
	<SidebarFvSidebarRoomList
		:title="space.getName()"
		:rooms="(roomList as any)" />
</template>
