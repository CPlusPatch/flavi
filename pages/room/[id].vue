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

// Initialize room and timeline
const room = ref(new MatrixRoom(id, store.client as MatrixClient));
const timeline = ref<MatrixEvent[]>([]);
const roomTimeline = new RoomTimeline(id, store.client as MatrixClient);

// Initialize message container and messages
const messageContainer = ref<HTMLDivElement | null>(null);
const messages = ref<HTMLDivElement | null>(null);

// Initialize scroll state
const isScrolledToBottom = ref(true);

// Update scroll state
function updateIsScrolledToBottom() {
	if (!messageContainer.value) return;
	isScrolledToBottom.value =
		Math.abs(
			messageContainer.value.scrollHeight -
				messageContainer.value.scrollTop -
				messageContainer.value.clientHeight
		) < 1;
	return isScrolledToBottom.value;
}

// Scroll to bottom of message container
const scrollToBottom = () => {
	if (!messages.value || !messageContainer.value) return;

	const lastMessage =
		messages.value.children[messages.value.children.length - 1];
	setTimeout(() => {
		lastMessage.scrollIntoView();
	}, 0);
};

// Update timeline on new event
const newEvent = async () => {
	timeline.value = [...roomTimeline.timeline];
	const wasScrolled = updateIsScrolledToBottom();
	await nextTick();
	if (wasScrolled) {
		scrollToBottom();
	}
};

// Update timeline when ready
const ready = () => {
	timeline.value = roomTimeline.timeline;
};

const typingMembers = ref<Set<string>>(new Set());

const updateTypingMembers = (members: Set<string>) => {
	typingMembers.value = members;
};

// Add event listeners for timeline updates
roomTimeline
	.on(events.events.timeline.EVENT, newEvent)
	.on(events.events.timeline.READY, ready)
	.on(events.events.timeline.TYPING_MEMBERS_UPDATED, updateTypingMembers);

// Remove event listeners on route leave or unmount
function removeListeners() {
	roomTimeline.removeInternalListeners();
	roomTimeline
		.off(events.events.timeline.EVENT, newEvent)
		.off(events.events.timeline.READY, ready)
		.off(
			events.events.timeline.TYPING_MEMBERS_UPDATED,
			updateTypingMembers
		);
}
onBeforeRouteLeave(removeListeners);
onUnmounted(removeListeners);

// Scroll to bottom on mount
onMounted(() => {
	if (!messages.value) return;
	scrollToBottom();
});

let isBackwards = false;

// Load more events when scrolling upwards
const loadMoreEvents = async () => {
	if (roomTimeline.isOngoingPagination) return false;

	if (roomTimeline.canPaginateBackward()) {
		await roomTimeline.paginateTimeline(true);
	}

	timeline.value = roomTimeline.timeline;
	await nextTick();

	if (!isBackwards) {
		scrollToBottom();
	}

	isBackwards = true;
};

// Get members of the room
const members: MatrixUser[] = room.value.room
	.getMembers()
	.map(
		m =>
			(store.client?.getUser(m.userId) &&
				new MatrixUser(m.userId, store.client as MatrixClient)) ||
			null
	)
	.filter(m => m) as any;

// Load live timeline
await roomTimeline.loadLiveTimeline();

useHead({
	title: `${room.value.getName()} · Flavi`,
});
</script>
<template>
	<div class="flex overflow-x-hidden flex-row grow">
		<div class="grow min-w-0 max-h-full flex flex-col justify-between">
			<div
				class="w-full bg-accent-800 flex flex-row shadow border-b-1 border-accent-900 text-xl text-white items-center">
				<ButtonFvButton
					class="flex items-center justify-center hover:bg-accent-700 !rounded-none h-full !px-4 !py-2 md:hidden"
					@click="store.state.sidebarOpen = true">
					<Icon name="tabler:menu-2" class="w-5 h-5"
				/></ButtonFvButton>
				<div
					class="px-2 py-3 flex flex-row whitespace-nowrap line-clamp-1 gap-2 items-center">
					<Icon name="tabler:hash" class="flex-shrink-0" /><span
						class="grow overflow-hidden text-ellipsis"
						>{{ room.getName() }}</span
					>
				</div>
			</div>
			<div
				ref="messageContainer"
				class="grow max-w-full pt-6 pb-4 overflow-y-scroll children:[overflow-anchor:none] last-children:[overflow-anchor:auto] no-scrollbar flex flex-col"
				@scroll="updateIsScrolledToBottom">
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
			<div class="w-full relative">
				<Transition
					enter-active-class="duration-100"
					leave-active-class="duration-100"
					enter-from-class="opacity-0 translate-y-5"
					enter-to-class="opacity-100 translate-x-0"
					leave-to-class="opacity-0 translate-y-5">
					<button
						v-if="!isScrolledToBottom"
						class="absolute -top-8 right-3 py-1 px-3 bg-accent-900 text-dark-50 rounded-xl text-xs flex items-center gap-2"
						@click="() => scrollToBottom()">
						<Icon name="tabler:message-2-down" />
						Jump to latest
					</button>
				</Transition>
				<InputFvMessageSender
					:typing="typingMembers"
					:room="(room as MatrixRoom)"
					@send="event_id => {}" />
			</div>
		</div>
		<div
			class="bg-accent-900 w-70 h-full p-3 shrink-0 flex-col gap-2 overflow-hidden hidden md:flex">
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
