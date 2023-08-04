<script setup lang="ts">
import { MatrixClient, MatrixEvent, MatrixEventEvent } from "matrix-js-sdk";
import linkifyHtml from "linkify-html";
import { MatrixUser } from "~/classes/User";
import { MatrixMessage } from "~/classes/Event";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";

const store = useStore();

const props = defineProps<{
	message: MatrixEvent;
	previousEvent?: MatrixEvent;
}>();

const isLoading = ref(props.message.isBeingDecrypted());
const message = ref(props.message);

const onDecrypted = () => {
	isLoading.value = false;
	message.value = props.message;
};

props.message.on(MatrixEventEvent.Decrypted, onDecrypted);

onUnmounted(() => {
	props.message.off(MatrixEventEvent.Decrypted, onDecrypted);
});

const user = new MatrixUser(
	message.value.event.sender ?? "",
	store.client as MatrixClient
);

const event = computed(
	() =>
		new MatrixMessage(
			message.value as MatrixEvent,
			store.client as MatrixClient
		)
);

// Function to check the time difference between two events
const getDateDifference = (event1: MatrixEvent, event2: MatrixEvent) =>
	(event1.getDate()?.getTime() ?? 0) - (event2.getDate()?.getTime() ?? 0);

// Show header if messages are separated by more than 5 hours
const isPreviousEventMessage =
	props.previousEvent?.getType() === "m.room.message";

const showHeader = computed(
	() =>
		!isPreviousEventMessage ||
		props.previousEvent.sender?.userId !== message.value.sender?.userId ||
		getDateDifference(event.value.event, props.previousEvent) >
			// 5 minutes
			1000 * 60 * 5
);

const mediaUrl = event.value.isImage()
	? await event.value.decryptAttachment()
	: "";

const timeAgo = useTimeAgo(event.value.event.getDate() ?? Date.now());

const room = new MatrixRoom(
	message.value.event.room_id ?? "",
	store.client as MatrixClient
);

const reply = room.room.findEventById(event.value.event.replyEventId ?? "");

const log = console.error;

const replyBody = document.createElement("div");

const formattedBody = (event: MatrixEvent) => {
	const bodyHtml = document.createElement("div");

	// Escape characters of body for usage in HTML
	const escapedBody = event
		.getContent()
		.body.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	bodyHtml.innerHTML = (
		(event.getContent().formatted_body ?? escapedBody ?? "") as string
	).replace(/<mx-reply.*>.*?<\/mx-reply>/gi, "");

	bodyHtml.innerHTML = linkifyHtml(bodyHtml.innerHTML);

	[...bodyHtml.getElementsByTagName("img")].forEach(img => {
		img.src = store.client?.mxcUrlToHttp(img.src) ?? "";
	});

	return bodyHtml.innerHTML;
};

const body = computed(() => formattedBody(event.value.event));

if (reply) {
	replyBody.innerHTML = (
		(reply.getContent().formatted_body ??
			reply.getContent().body ??
			"") as string
	).replace(/<mx-reply.*>.*?<\/mx-reply>/gi, "");

	[...replyBody.getElementsByTagName("img")].forEach(img => {
		img.src = store.client?.mxcUrlToHttp(img.src) ?? "";
	});
}

const setReply = () => {
	store.replies[room.id] = {
		eventId: event.value.event.getId()!,
		text: "",
	};
};

// Mark as read on visible
const messageRef = ref(null);
useIntersectionObserver(messageRef, ([{ isIntersecting }]) => {
	if (isIntersecting) {
		if (
			!room.room.hasUserReadEvent(
				store.client?.getUserId() ?? "",
				event.value.event.getId() ?? ""
			)
		) {
			store.client?.sendReadReceipt(event.value.event as MatrixEvent);
		}
	}
});
</script>

<template>
	<Transition
		enter-active-class="duration-100"
		enter-from-class="opacity-0 translate-y-5"
		enter-to-class="opacity-100 translate-x-0">
		<div
			v-if="message"
			ref="messageRef"
			:class="[
				'flex flex-col py-1 px-6 py-0 gap-1 hover:bg-dark-700 relative group duration-200',
				showHeader && 'mt-2',
			]">
			<div class="flex flex-row gap-4">
				<div class="w-10 shrink-0"></div>
				<TwemojiParse v-if="reply?.sender">
					<div class="flex flex-row gap-1 items-center text-xs">
						<Icon
							name="material-symbols:reply-rounded"
							class="text-white flex-shrink-0" />
						<span class="text-white">{{ reply.sender.name }}</span>
						<div
							v-if="event.isText()"
							class="text-dark-400 gap-2 break-word line-clamp-1 text-ellipsis"
							v-html="replyBody.innerHTML"></div>
					</div>
				</TwemojiParse>
			</div>
			<div
				v-if="event.shouldShowMessage() && !event.isMemberEvent()"
				class="flex flex-row gap-4 w-full max-w-full">
				<div v-if="!showHeader" class="w-10 shrink-0"></div>
				<div
					v-if="showHeader"
					class="h-10 hover:-translate-y-1 duration-200 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0"
					@click="log">
					<img
						:src="user.getAvatarUrl()"
						class="w-full h-full object-cover" />
				</div>
				<div
					:key="String(isLoading)"
					class="flex flex-col gap-1 text-sm grow break-words">
					<div
						v-if="showHeader"
						class="flex flex-row items-center gap-3">
						<div :class="['font-semibold text-[#f2f3f5]']">
							{{ user.getDisplayName() }}
						</div>
						<div
							v-if="showHeader"
							class="text-gray-400 text-xs shrink-0 text-right mt-0.5">
							{{ timeAgo }}
						</div>
					</div>
					<TwemojiParse v-if="event.isText()">
						<div
							class="text-[#dbdee1] gap-2 break-all message-body whitespace-pre-wrap"
							v-html="body"></div>
					</TwemojiParse>
					<div
						v-if="isLoading"
						class="text-gray-400 flex flex-row gap-x-2 items-center">
						<Spinner theme="orangeDark" /> Decrypting...
					</div>
					<div
						v-if="event.isImage()"
						class="max-w-sm rounded shadow overflow-hidden">
						<img :src="mediaUrl" />
					</div>
					<div
						v-if="event.isVideo()"
						class="max-w-sm rounded shadow overflow-hidden">
						<MediaFvVideo
							:body="event.getContent().body"
							:file="event.getContent().file"
							:is-encrypted="event.event.isEncrypted()"
							:thumbnail-file="
								event.getContent().info.thumbnail_file
							"
							:thumbnail-info="
								event.getContent().info.thumbnail_info
							"
							:info="event.getContent().info" />
					</div>
					<div
						v-if="
							event.getType() === 'm.bad.encrypted' ||
							event.getContent().cyphertext
						"
						class="text-gray-200 font-italic">
						<Icon
							name="ic:round-lock"
							class="align-baseline mb-0.5 mr-1" />Encrypted
						message
					</div>
					<div
						v-if="event.isRedacted()"
						class="text-red-200 font-semibold">
						<Icon
							name="ic:round-do-not-disturb-alt"
							class="align-baseline mb-0.5 mr-1" />Redacted Event
					</div>
				</div>
			</div>

			<!-- Floating action buttons for reply, more settings -->
			<div
				v-if="event.shouldShowMessage()"
				class="absolute right-10 -top-7 rounded children:p-2 bg-dark-900 hidden group-hover:flex flex-row overflow-hidden ring-1 ring-dark-700">
				<button
					class="flex items-center justify-center duration-200"
					@click="setReply">
					<Icon
						name="tabler:message-circle"
						class="text-gray-400 w-5 h-5 hover:text-gray-200 duration-200" />
				</button>
				<button class="flex items-center justify-center duration-200">
					<Icon
						name="tabler:pencil"
						class="text-gray-400 w-5 h-5 hover:text-gray-200 duration-200" />
				</button>
			</div>

			<MessagesFvStateEvent
				v-if="event.event.getType() !== 'm.room.message'"
				:event="(event as MatrixMessage)" />
		</div>
	</Transition>
</template>

<style>
.message-body img[data-mx-emoticon] {
	height: 32px !important;
	width: auto !important;
	display: inline;
}

.message-body code {
	background-color: #2d2d2d;
	padding: 0.2rem 0.4rem;
	border-radius: 0.2rem;
	display: inline;
}

.message-body a {
	color: hsl(213deg 94% 73%);
}

.message-body a:hover {
	text-decoration: underline;
}

img.twemojiParse {
	vertical-align: middle !important;
	height: 1.4em;
	width: 1.4em;
	display: inline;
	margin-top: -0.3rem;
}

.message-body:empty > img:only-child {
	height: 40px !important;
	width: auto !important;
	display: inline;
}
</style>
