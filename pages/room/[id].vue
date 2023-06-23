<script setup lang="ts">
import { IRoomTimelineData, MatrixClient, MatrixEvent, Room, RoomEvent } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";
import FvMessage from "~/components/messages/FvMessage.vue";
import { nanoid } from "nanoid";

const id = useRoute().params.id as string;

const store = useStore();

if (!store.client) throw createError("Client not working");

const room = ref(new MatrixRoom(id, store.client as MatrixClient));
const sentFromMe: string[] = [];
const events = ref<MatrixEvent[]>([]);
const key = ref(nanoid())

events.value = room.value.timeline.getEvents();

const updateTimeline = async (event: MatrixEvent, room2?: Room, _toStartOfTimeline?: boolean, _removed?: boolean, data?: IRoomTimelineData) => {
	if (room2?.roomId === room.value.id && !sentFromMe.includes(event.getId() ?? "")) {
		room.value.refreshTimeline();
		events.value = [...room.value.timeline.getEvents()]; // We do this to avoid proxies and trigger an update
	}
}

store.client.on(RoomEvent.Timeline, updateTimeline);

const messageBody = ref("");

onBeforeRouteLeave(removeListeners)
onUnmounted(removeListeners)

function removeListeners() {
	store.client?.off(RoomEvent.Timeline, updateTimeline);
}

onMounted(() => {
	setTimeout(() => {
		document.getElementsByClassName("message-view-container")[0].scrollTop = document.getElementsByClassName("message-view-container")[0].scrollHeight;
	}, 300)
});

const send = async (e: Event) => {
	const body = messageBody.value;
	messageBody.value = "";
	if (body !== "") {
		const response = await store.client?.sendTextMessage(room.value.id, body);
		sentFromMe.push(response?.event_id ?? "");
	}
}

</script>

<template>
	<div class="w-full max-h-full flex flex-col justify-between">
		<div class="grow max-w-full px-6 pt-6 overflow-y-scroll no-scrollbar overscroll-y-contain snap-y snap-proximity message-view-container">
			<div class="flex flex-col gap-6 message-view">
				<FvMessage v-for="(message, index) of events.filter(e => !e.isRedaction())" :key="message.getId() ?? ''" :message="(message as MatrixEvent)" :previousMessage="events[index - 1]"/>
			</div>
		</div>
		<div class="w-full">
			<form @submit.prevent="send" class="w-full bg-dark-900 flex items-center px-2 gap-2 justify-between pb-7 pt-3">
				<button class="p-1.5 hover:scale-102 duration-100">
					<Icon name="ic:round-file-upload" class="h-6 w-6 text-white"/>
				</button>
				<input v-model="messageBody" name="message" class="!bg-dark-800 rounded-lg grow py-2 px-3 text-sm ring-0 outline-none focus:outline-none text-gray-100" placeholder="What's on your mind?"/>
				<button type="submit" class="p-1.5 hover:scale-102 duration-100">
					<Icon name="ic:round-send" class="h-6 w-6 text-white"/>
				</button>
			</form>
		</div>
	</div>
</template>

<style>
.message-view > div:last-child {
	scroll-snap-align: end;
	padding-bottom: 20px;
}
</style>