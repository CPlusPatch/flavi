<script setup lang="ts">
import { MatrixMessage } from "~/classes/Event";
import { MatrixRoom } from "~/classes/Room";

defineProps<{
	title: string;
	rooms: {
		room: MatrixRoom;
		lastMessage: MatrixMessage | null;
	}[];
}>();
</script>
<template>
	<div class="h-full overflow-hidden">
		<div class="w-full py-3 px-3 border-b border-accent-800">
			<h1 class="font-semibold text-lg text-white">{{ title }}</h1>
		</div>
		<div
			class="p-2 flex-col gap-1 flex h-full no-scrollbar overflow-y-scroll grow overflow-x-hidden">
			<TransitionGroup
				v-if="rooms.length > 0"
				move-class="duration-200 transition-all">
				<PreviewsFvRoomPreview
					v-for="{ room, lastMessage } of rooms"
					:key="room.id"
					:room="(room as any)"
					:last-message="(lastMessage as any)" />
			</TransitionGroup>
			<PreviewsFvRoomPreviewSkeleton v-for="i of 15" v-else :key="i" />
		</div>
	</div>
</template>
