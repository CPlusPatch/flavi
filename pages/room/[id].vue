<script setup lang="ts">
import { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";
import { RoomTimeline } from "~/classes/RoomTimeline";
import { MatrixUser } from "~/classes/User";
import FvMessage from "~/components/messages/FvMessage.vue";
import events from "~/utils/events";

const id = useRoute().params.id as string;

const store = useStore();

if (!store.client) throw createError("Client not working");

const room = ref(new MatrixRoom(id, store.client as MatrixClient));
const scrollBottom = ref(0);
const messageContainer = ref<HTMLDivElement | null>(null);
const messages = ref<HTMLDivElement | null>(null);
const timeline = ref<MatrixEvent[]>([]);

const roomTimeline = new RoomTimeline(id, store.client as MatrixClient);

const messageScroll = useScroll(messageContainer);
useMutationObserver(
	messages,
	mutation => {
		mutation.forEach(m => {
			if (m.type === "childList") setScrollBottom(scrollBottom.value);
		});
	},
	{
		childList: true,
	}
);

onBeforeRouteLeave(removeListeners);
onUnmounted(removeListeners);

const newEvent = async () => {
	timeline.value = [...roomTimeline.timeline];

	await nextTick();

	if (scrollBottom.value === 0) {
		setScrollBottom(0);
	} else {
		recalculateScrollBottom();
	}
};

const ready = () => {
	timeline.value = roomTimeline.timeline;
};

roomTimeline
	.on(events.events.timeline.EVENT, newEvent)
	.on(events.events.timeline.READY, ready);

function removeListeners() {
	roomTimeline.removeInternalListeners();
	roomTimeline
		.off(events.events.timeline.EVENT, newEvent)
		.off(events.events.timeline.READY, ready);
}

onMounted(() => {
	setScrollBottom(0);
});

const loadMoreEvents = async () => {
	if (roomTimeline.isOngoingPagination) return false;

	if (roomTimeline.canPaginateBackward()) {
		await roomTimeline.paginateTimeline(true);
	}

	timeline.value = roomTimeline.timeline;

	// FIXME: Why does this sometimes work?
	setTimeout(() => {
		setScrollBottom(scrollBottom.value);
	}, 0);
};

/**
 * Calculate scrollBottom based on the scrollHeight
 */
const recalculateScrollBottom = () => {
	if (!messageContainer.value) return false;

	scrollBottom.value =
		messageContainer.value.scrollHeight -
		messageContainer.value.scrollTop -
		messageContainer.value.clientHeight;
};

/**
 * Set the container's scrollBottom property, which doesnt exist in the DOM but
 * we can calculate it and set it using scrollTop and scrollHeight
 */
const setScrollBottom = (bottom: number) => {
	if (!messageContainer.value) return false;
	messageScroll.y.value =
		messageContainer.value.scrollHeight -
		messageContainer.value.clientHeight -
		bottom;
};

const members: MatrixUser[] = room.value.room
	.getMembers()
	.map(
		m =>
			(store.client?.getUser(m.userId) &&
				new MatrixUser(m.userId, store.client as MatrixClient)) ||
			null
	)
	.filter(m => m) as any;
await roomTimeline.loadLiveTimeline();
</script>
<template>
	<div class="flex overflow-x-hidden flex-row grow">
		<div class="grow min-w-0 max-h-full flex flex-col justify-between">
			<div
				class="w-full bg-dark-800 flex flex-row gap-2 p-3 shadow border-b-1 border-dark-900 text-xl text-white items-center">
				<Icon name="tabler:hash" /><span>{{ room.getName() }}</span>
			</div>
			<div
				ref="messageContainer"
				class="grow max-w-full pt-6 overflow-y-scroll children:[overflow-anchor:none] last-children:[overflow-anchor:auto] no-scrollbar flex flex-col"
				@scroll="recalculateScrollBottom">
				<MessagesFvMessageSkeleton
					v-if="roomTimeline.canPaginateBackward()" />
				<div
					v-if="roomTimeline.canPaginateBackward()"
					v-is-visible="loadMoreEvents">
					<MessagesFvMessageSkeleton />
				</div>
				<div ref="messages" class="flex flex-col">
					<div
						v-for="(message, index) in timeline"
						:key="message.getId()">
						<FvMessage
							:message="(message as MatrixEvent)"
							:previous-event="(timeline[index - 1] as MatrixEvent)" />
					</div>
				</div>
				<MessagesFvMessageSkeleton
					v-if="roomTimeline.canPaginateForward()" />
			</div>
			<div class="w-full">
				<InputFvMessageSender
					:room="(room as MatrixRoom)"
					@send="event_id => {}" />
			</div>
		</div>
		<div
			class="bg-dark-900 w-70 h-full p-3 shrink-0 flex-col gap-2 overflow-hidden hidden md:flex">
			<h3 class="text-gray-100 text-lg font-semibold">Members</h3>
			<SeparatorsFvSeparator class="w-full" />
			<div class="flex-col flex gap-1 overflow-y-scroll no-scrollbar">
				<UsersFvUser
					v-for="member of members"
					:key="member!.id"
					:user="member!" />
			</div>
		</div>
	</div>
</template>
