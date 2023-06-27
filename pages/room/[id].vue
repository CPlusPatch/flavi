<script setup lang="ts">
import { Direction, EventTimeline, IRoomTimelineData, MatrixClient, MatrixEvent, Room, RoomEvent } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";
import FvMessage from "~/components/messages/FvMessage.vue";

const id = useRoute().params.id as string;

const store = useStore();
const isLoadingMoreEvents = ref(false);

if (!store.client) throw createError("Client not working");

const room = ref(new MatrixRoom(id, store.client as MatrixClient));
const sentFromMe: string[] = [];
const events = ref<MatrixEvent[]>([]);
let pagination = 0;

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
		document.getElementsByClassName("message-view")[0].scrollTop = document.getElementsByClassName("message-view")[0].scrollHeight;
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

const messageContainer = ref<HTMLDivElement | null>(null);

const loadMoreEvents = async () => {
	if (isLoadingMoreEvents.value) return false;
	if (!messageContainer.value) return false;
	isLoadingMoreEvents.value = true;
	const originalScrollHeight = messageContainer.value?.scrollHeight;

	let timeline: EventTimeline | null = room.value.timelineSet.getLiveTimeline();
	pagination++;
	
	for (let i = 0; i < pagination; i++) {
		const result = await store.client?.paginateEventTimeline(timeline!, {
			backwards: true,
		});

		if (result === false) {
			return false;
		} else {
			timeline = timeline?.getNeighbouringTimeline(Direction.Backward) ?? null;
		}
	}

	events.value = [
		...(timeline?.getEvents() ?? []),
		...events.value,
	]

	await nextTick();

	if (!messageContainer.value) return false;

	messageContainer.value.scrollTop = messageContainer.value.scrollHeight - originalScrollHeight;
	isLoadingMoreEvents.value = false;
}

</script>

<template>
	<div class="w-full max-h-full flex flex-col justify-between">
		<div class="grow max-w-full px-6 pt-6 overflow-y-scroll no-scrollbar flex flex-col message-view" ref="messageContainer">
			<MessagesFvMessageSkeleton />
			<div v-is-visible="loadMoreEvents"><MessagesFvMessageSkeleton /></div>
			<FvMessage v-for="(message, index) of events.filter(e => !e.isRedaction())" :key="message.getId() ?? ''" :message="(message as MatrixEvent)" :previousEvents="(events.slice(0, index) as MatrixEvent[])"/>
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
	padding-bottom: 20px;
	margin-bottom: 0;
}
</style>