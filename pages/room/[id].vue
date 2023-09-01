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

const isDirectMessage = room.value.isDirectMessage();

// Initialize message container and messages
const messageContainer = ref<HTMLDivElement | null>(null);
const messages = ref<HTMLDivElement | null>(null);

// Initialize scroll state
const isScrolledToBottom = ref(true);

const sidebarShown = ref(true);

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
const readReceipts = ref<{
	[key: string]: MatrixUser[];
}>({});

const updateTypingMembers = (members: Set<string>) => {
	typingMembers.value = members;
};

const updateReadReceipts = () => {
	const newReadReceipts: any = [];
	timeline.value.forEach(event => {
		const users = room.value.room
			.getReceiptsForEvent(event as MatrixEvent)
			.filter(
				r =>
					r.type === "m.read" &&
					r.userId !== store.client?.getUserId()
			)
			.map(r => new MatrixUser(r.userId, store.client as MatrixClient));

		if (users.length > 0) {
			newReadReceipts[event.getId() ?? ""] = users;
		}
	});

	readReceipts.value = newReadReceipts;
};

// Add event listeners for timeline updates
roomTimeline
	.on(events.events.timeline.EVENT, newEvent)
	.on(events.events.timeline.READY, ready)
	.on(events.events.timeline.TYPING_MEMBERS_UPDATED, updateTypingMembers)
	.on(events.events.timeline.LIVE_RECEIPT, updateReadReceipts);

// Remove event listeners on route leave or unmount
function removeListeners() {
	roomTimeline.removeInternalListeners();
	roomTimeline
		.off(events.events.timeline.EVENT, newEvent)
		.off(events.events.timeline.READY, ready)
		.off(events.events.timeline.TYPING_MEMBERS_UPDATED, updateTypingMembers)
		.off(events.events.timeline.LIVE_RECEIPT, updateReadReceipts);
}
onBeforeRouteLeave(removeListeners);
onUnmounted(removeListeners);

// Scroll to bottom on mount
onMounted(() => {
	if (!messages.value) return;
	scrollToBottom();
});

// Load more events when scrolling upwards
const loadMoreEvents = async () => {
	if (roomTimeline.isOngoingPagination) return;

	if (roomTimeline.canPaginateBackward()) {
		await roomTimeline.paginateTimeline(true);
	}

	timeline.value = roomTimeline.timeline;
	const wasScrolled = updateIsScrolledToBottom();
	await nextTick();
	if (wasScrolled) {
		scrollToBottom();
	}
};

useInfiniteScroll(messages, loadMoreEvents, {
	distance: 500,
	direction: "top",
	behavior: "instant",
});

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
updateReadReceipts();

const sidebarRef = ref<HTMLDivElement | null>(null);

// Slide out the sidebar when function toggleSidebar is called using the Web Animations API
const toggleSidebar = () => {
	const sidebarWidth = 280;

	if (sidebarShown.value) {
		// Also transition width from full to 0px
		const animation = sidebarRef.value?.animate(
			[
				{
					transform: `translateX(0)`,
					width: `${sidebarWidth}px`,
				},
				{
					transform: `translateX(${sidebarWidth}px)`,
					width: `0px`,
				},
			],
			{
				duration: 200,
				easing: "ease",
				fill: "forwards",
			}
		);

		animation!.onfinish = () => {
			sidebarRef.value?.classList.add("!hidden");
		};
	} else {
		sidebarRef.value?.classList.remove("!hidden");
		sidebarRef.value?.animate(
			[
				{
					transform: `translateX(${sidebarWidth}px)`,
					width: `0px`,
				},
				{
					transform: `translateX(0)`,
					width: `${sidebarWidth}px`,
				},
			],
			{
				duration: 200,
				easing: "ease",
				fill: "forwards",
			}
		);
	}
	sidebarShown.value = !sidebarShown.value;
};
</script>
<template>
	<div
		class="flex overflow-x-hidden flex-row grow min-w-screen md:min-w-auto md:w-auto">
		<div
			class="grow min-w-0 flex-1 max-h-full flex flex-col justify-between">
			<div
				class="w-full bg-accent-800 flex flex-row shadow-sm border-b-0.5 border-accent-900 text-xl text-white items-center">
				<ButtonFvButton
					class="flex items-center justify-center hover:bg-accent-700 !rounded-none h-full !px-4 !py-2 md:hidden"
					@click="store.state.sidebarOpen = !store.state.sidebarOpen">
					<Icon name="tabler:menu-2" class="w-5 h-5"
				/></ButtonFvButton>
				<div
					class="px-3 py-3 flex flex-row whitespace-nowrap line-clamp-1 gap-2 items-center font-semibold">
					<Icon
						:name="isDirectMessage ? 'tabler:at' : 'tabler:hash'"
						class="flex-shrink-0" /><span
						class="grow overflow-hidden text-ellipsis"
						>{{ room.getName() }}</span
					>
				</div>
				<div class="ml-auto p-3">
					<ButtonFvButton
						theme="transparentIcon"
						class="!p-2"
						@click="toggleSidebar"
						><Icon
							:name="
								sidebarShown
									? 'tabler:layout-sidebar-right-collapse-filled'
									: 'tabler:layout-sidebar-right-expand-filled'
							"
							class="w-5 h-5"
					/></ButtonFvButton>
				</div>
			</div>
			<div
				id="message-container"
				ref="messageContainer"
				class="grow max-w-full pt-6 pb-4 overflow-y-scroll children:[overflow-anchor:none] last-children:[overflow-anchor:auto] no-scrollbar flex flex-col"
				@scroll="updateIsScrolledToBottom">
				<!-- this element is used to push messages to the bottom of the message container, such as when there's only a few messages. -->
				<!-- justify-content: flex-end; should work, but a bug in chrome causes that to break vertical scrolling. -->
				<div class="m-t-auto"></div>
				<!-- <MessagesFvMessageSkeleton
					v-if="roomTimeline.canPaginateBackward()" />
				<div
					v-if="roomTimeline.canPaginateBackward()"
					v-is-visible="loadMoreEvents">
					<MessagesFvMessageSkeleton />
				</div> -->
				<MessagesFvMessageSkeleton
					v-if="roomTimeline.canPaginateBackward()" />
				<MessagesFvMessageSkeleton
					v-if="roomTimeline.canPaginateBackward()" />
				<div ref="messages" class="flex flex-col">
					<div
						v-for="(message, index) in timeline"
						:key="message.getId()">
						<FvMessage
							:has-been-read-by="[]"
							:message="message as MatrixEvent"
							:previous-event="
								timeline[index - 1] as MatrixEvent
							" />
						<Transition
							enter-from-class="scale-60 opacity-0"
							enter-to-class="scale-100 opacity-100"
							enter-active-class="duration-300"
							leave-to-class="scale-60 opacity-0"
							leave-from-class="scale-100 opacity-100"
							leave-active-class="duration-300">
							<div
								v-if="
									(readReceipts[message.getId() ?? ''] ?? [])
										.length > 0
								"
								class="flex justify-end w-full px-4 py-1">
								<div class="flex-row gap-1 flex">
									<img
										v-for="user of readReceipts[
											message.getId() ?? ''
										] ?? []"
										:key="user.id"
										:title="`Read by ${user.getDisplayName()}`"
										:src="user.getAvatarUrl()"
										class="w-4 h-4 rounded-full ring-1 ring-accent-800" />
									<div
										v-if="
											(
												readReceipts[
													message.getId() ?? ''
												] ?? []
											).length > 2
										"
										:title="`Read by ${(
											readReceipts[
												message.getId() ?? ''
											] ?? []
										)
											.map(u => u.getDisplayName())
											.join(', ')}`"
										class="rounded-full w-4 h-4 flex items-center justify-center bg-accent-800 text-accent-100">
										<Icon
											name="tabler:dots"
											class="w-3.5 h-3.5" />
									</div>
								</div>
							</div>
						</Transition>
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
						class="absolute -top-8 right-3 py-1 px-3 bg-accent-900 text-accent-50 rounded-xl text-xs flex items-center gap-2"
						@click="() => scrollToBottom()">
						<Icon name="tabler:message-2-down" />
						Jump to latest
					</button>
				</Transition>
				<InputFvMessageSender
					:typing="typingMembers"
					:room="room as MatrixRoom"
					@send="event_id => {}" />
			</div>
		</div>
		<div
			ref="sidebarRef"
			class="bg-accent-900 w-[280px] h-full p-3 shrink-0 flex-col gap-2 overflow-hidden hidden md:flex">
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
