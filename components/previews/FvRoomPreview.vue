<script setup lang="ts">
import { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";
import { RoomTimeline } from "~/classes/RoomTimeline";
import { MatrixUser } from "~/classes/User";

const props = defineProps<{
	room: MatrixRoom;
}>();

const client = useStore().client;

const lastMessage: Ref<MatrixEvent | null> = ref(null);

const roomTimeline = new RoomTimeline(props.room.id, client as MatrixClient);

function newEvent() {
	const timeline = [...roomTimeline.timeline];
	timeline.reverse();
	lastMessage.value =
		timeline.find(event => event.getType() === "m.room.message") ?? null;
}

function removeListeners() {
	roomTimeline.removeInternalListeners();
	roomTimeline
		.off(events.events.timeline.EVENT, newEvent)
		.off(events.events.timeline.READY, newEvent);
}

roomTimeline
	.on(events.events.timeline.EVENT, newEvent)
	.on(events.events.timeline.READY, newEvent);

onBeforeRouteLeave(removeListeners);
onUnmounted(removeListeners);

const dmUserId = props.room.isDirectMessage();

let dmUser;
try {
	dmUser =
		dmUserId && new MatrixUser(dmUserId.userId, client as MatrixClient);
} catch {
	//
}

// Is "online" or "offline"
const presence = dmUser && dmUser.getPresenceStatus();

const unreadCount = props.room.room.getUnreadNotificationCount();

await roomTimeline.loadLiveTimeline();
</script>

<template>
	<NuxtLink
		:to="`/room/${room.id}`"
		class="flex flex-row gap-2 duration-200 hover:bg-dark-700 p-2 rounded">
		<div
			class="h-8 w-8 relative rounded-full shrink-0 flex items-center justify-center shrink-0 shadow">
			<img
				:src="
					room.getAvatarUrl(96) ??
					`https://api.dicebear.com/6.x/initials/svg?seed=${room.getName()}&chars=1`
				"
				class="w-full h-full object-cover rounded-full" />
			<div
				v-if="dmUserId"
				class="absolute rounded-full p-1 -bottom-1 -right-1 bg-dark-800">
				<div
					v-if="presence === 'online'"
					class="bg-green-500 w-2 h-2 rounded-full"></div>
				<div v-else class="bg-gray-500 w-2 h-2 rounded-full"></div>
			</div>
		</div>
		<div
			class="flex flex-col h-full grow justify-around text-sm overflow-hidden text-ellipsis">
			<h3
				class="m-0 line-clamp-1 text-ellipsis text-gray-100 font-semibold"
				:title="room.getName()">
				{{ room.getName() }}
			</h3>
			<span
				v-if="lastMessage"
				class="text-gray-300 line-clamp-1 text-xs"
				:title="lastMessage.getContent().body"
				>{{ lastMessage.sender?.rawDisplayName }}:
				{{ lastMessage.getContent().body }}</span
			>
		</div>
		<div
			v-if="unreadCount > 0"
			class="shrink-0 flex items-center justify-center pl-1">
			<span
				class="rounded-full w-[16px] h-[16px] text-xs font-bold text-white bg-red-600 flex items-center justify-center"
				>{{ unreadCount }}</span
			>
		</div>
	</NuxtLink>
</template>
