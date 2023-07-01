<script setup lang="ts">
import { Direction, EventTimeline, IRoomTimelineData, MatrixClient, MatrixEvent, Room, RoomEvent } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";
import { MatrixUser } from "~/classes/User";
import FvMessage from "~/components/messages/FvMessage.vue";

const id = useRoute().params.id as string;

const store = useStore();
const isLoadingMoreEvents = ref(false);

if (!store.client) throw createError("Client not working");

const room = ref(new MatrixRoom(id, store.client as MatrixClient));
const sentFromMe: string[] = [];
const events = ref<MatrixEvent[]>([]);
const scrollBottom = ref(0);
let pagination = 0;
const messageContainer = ref<HTMLDivElement | null>(null);
const hasReachedEndOfTimeline = ref(false);

const messageScroll = useScroll(messageContainer);
useMutationObserver(messageContainer, (mutation) => {
	mutation.forEach(m => {
		if (m.type === "childList") setScrollBottom(scrollBottom.value);
	})
}, {
	childList: true,
})

events.value = room.value.timeline.getEvents().filter(e => !e.isRedaction());

const updateTimeline = async (event: MatrixEvent, room2?: Room, _toStartOfTimeline?: boolean, _removed?: boolean, data?: IRoomTimelineData) => {
	if (room2?.roomId === room.value.id && !sentFromMe.includes(event.getId() ?? "")) {
		room.value.refreshTimeline();
		events.value = [...room.value.timeline.getEvents()].filter(e => !e.isRedaction()); // We do this to avoid proxies and trigger an update
		await nextTick();
	}


	if (scrollBottom.value === 0) {
		setScrollBottom(0);
	} else {
		recalculateScrollBottom();
	}
}

store.client.on(RoomEvent.Timeline, updateTimeline);

onBeforeRouteLeave(removeListeners)
onUnmounted(removeListeners)

function removeListeners() {
	store.client?.off(RoomEvent.Timeline, updateTimeline);
}

onMounted(() => {
	setScrollBottom(0);
});

const loadMoreEvents = async () => {
	if (isLoadingMoreEvents.value) return false;
	if (!messageContainer.value) return false;
	isLoadingMoreEvents.value = true;

	let timeline: EventTimeline | null = room.value.timelineSet.getLiveTimeline();
	pagination++;

	for (let i = 0; i < pagination; i++) {
		try {
			await store.client?.paginateEventTimeline(timeline!, {
				backwards: true,
			});
		} catch {
			try {
				const newRoom = await store.client?.scrollback(room.value.room as Room, 30);
				room.value = new MatrixRoom(newRoom?.roomId ?? "", store.client as MatrixClient)

				await store.client?.paginateEventTimeline(timeline!, {
					backwards: true,
				});
			} catch {
				hasReachedEndOfTimeline.value = true;
				return false;
			}
		}
		timeline = timeline?.getNeighbouringTimeline(Direction.Backward) ?? null;
	}

	events.value = [
		...(timeline?.getEvents() ?? []),
		...events.value,
	].filter(e => !e.isRedaction())

	await nextTick();

	// FIXME: Why does this sometimes work?
	setTimeout(() => {
		setScrollBottom(scrollBottom.value);
		isLoadingMoreEvents.value = false;
	}, 0);
}

/**
 * Calculate scrollBottom based on the scrollHeight
 */
const recalculateScrollBottom = () => {
	if (!messageContainer.value) return false;

	scrollBottom.value = messageContainer.value.scrollHeight - messageContainer.value.scrollTop - messageContainer.value.clientHeight;
}

/**
 * Set the container's scrollBottom property, which doesnt exist in the DOM but
 * we can calculate it and set it using scrollTop and scrollHeight
 */
const setScrollBottom = (bottom: number) => {
	if (!messageContainer.value) return false;

	messageScroll.y.value = messageContainer.value.scrollHeight - messageContainer.value.clientHeight - bottom;
}

const members = room.value.room.getMembers().map(m => store.client?.getUser(m.userId) && new MatrixUser(m.userId, store.client as MatrixClient) || null).filter(m => m);

</script>

<template>
	<div class="flex overflow-x-hidden flex-row grow">
		<div class="grow min-w-0 max-h-full flex flex-col justify-between">
			<div @scroll="recalculateScrollBottom"
				class="grow max-w-full px-6 pt-6 overflow-y-scroll children:[overflow-anchor:none] last-children:[overflow-anchor:auto] no-scrollbar flex flex-col"
				ref="messageContainer">
				<MessagesFvMessageSkeleton v-if="!hasReachedEndOfTimeline" />
				<div v-is-visible="loadMoreEvents" v-if="!hasReachedEndOfTimeline">
					<MessagesFvMessageSkeleton />
				</div>
				<FvMessage v-for="(message, index) of events" :key="message.event.event_id ?? ''"
					:message="(message as MatrixEvent)" :previousEvents="(events.slice(0, index) as MatrixEvent[])" />
			</div>
			<div class="w-full">
				<InputFvMessageSender :room="(room as MatrixRoom)" @send="(event_id) => sentFromMe.push(event_id)" />
			</div>
		</div>
		<div class="bg-dark-900 w-70 h-full p-3 shrink-0 flex flex-col gap-2 overflow-hidden">
			<h3 class="text-gray-100 text-lg font-semibold">Members</h3>
			<SeparatorsFvSeparator class="w-full" />
			<div class="flex-col flex gap-4 overflow-y-scroll no-scrollbar">
				<UsersFvUser v-for="member of members" :key="member!.id" :user="member!"/>
			</div>
		</div>
	</div>
</template>