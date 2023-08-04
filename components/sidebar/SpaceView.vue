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
	<div>
		<div class="w-full py-3 px-3 border-b border-dark-800">
			<h1 class="font-semibold text-lg text-white">
				{{ space.getName() }}
			</h1>
		</div>
		<div
			class="p-2 flex-col gap-1 flex no-scrollbar overflow-y-scroll overflow-x-hidden">
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
	</div>
</template>
