<script setup lang="ts">
import { MatrixClient, MatrixEvent, MatrixEventEvent } from "matrix-js-sdk";
import linkifyHtml from "linkify-html";
import hljs from "highlight.js";
import { MatrixUser } from "~/classes/User";
import { MatrixMessage } from "~/classes/Event";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";
import "highlight.js/styles/github-dark.css";

const store = useStore();

const props = defineProps<{
	message: MatrixEvent;
	previousEvent?: MatrixEvent;
	hasBeenReadBy: MatrixUser[];
}>();

const isLoading = ref(props.message.isBeingDecrypted());
const message = ref(props.message);

const onDecrypted = () => {
	isLoading.value = false;
	message.value = props.message;
};

if (isLoading) {
	props.message.getDecryptionPromise()?.then(onDecrypted);
}

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

const mediaUrl = ref<string | null>(null);

if (event.value.isImage()) {
	event.value.decryptAttachment().then(url => {
		mediaUrl.value = url;
	});
}

const timeAgo = useTimeAgo(event.value.event.getDate() ?? Date.now());

const room = new MatrixRoom(
	message.value.event.room_id ?? "",
	store.client as MatrixClient
);

const reply = room.room.findEventById(event.value.event.replyEventId ?? "");

const showHeader = computed(
	() =>
		reply ||
		!isPreviousEventMessage ||
		props.previousEvent.sender?.userId !== message.value.sender?.userId ||
		getDateDifference(event.value.event, props.previousEvent) >
			// 5 minutes
			1000 * 60 * 5
);

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

	bodyHtml.innerHTML = (event.getContent().formatted_body ??
		escapedBody ??
		"") as string;

	// Highlight all <code> elements in string
	[...bodyHtml.getElementsByTagName("code")].forEach(code => {
		hljs.highlightElement(code);
	});

	// Replace all <a> elements that are mentions with mentions
	[...bodyHtml.getElementsByTagName("a")].forEach(a => {
		const userLink = decodeURIComponent(a.href).match(
			/^https?:\/\/matrix.to\/#\/(@.+:.+)/
		);
		if (userLink) {
			const userId = userLink[1];
			const span = document.createElement("span");

			span.classList.add(
				"text-accent-000",
				"rounded",
				"bg-accent-500",
				"p-0.5",
				"font-semibold",
				"cursor-pointer"
			);
			span.innerText = `@${new MatrixUser(
				userId,
				store.client as MatrixClient
			).getDisplayName()}`;
			span.dataset.userId = userId;

			a.replaceWith(span);
		}
	});

	bodyHtml.innerHTML = linkifyHtml(bodyHtml.innerHTML);

	[...bodyHtml.getElementsByTagName("mx-reply")].forEach(tag => {
		tag.remove();
	});

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

const setEdit = () => {
	if (event.value.event.sender?.userId !== store.client?.getUserId()) return;
	store.edits[room.id] = {
		eventId: event.value.event.getId()!,
		text: "",
	};
};

const scrollToOriginal = () => {
	if (!reply) throw new Error("Literally How");
	const messageContainer = document.getElementById("message-container");
	if (!messageContainer) throw new Error("No message container found?");
	const messageContainerBox = messageContainer.getBoundingClientRect();
	const originalElement = document.getElementById(
		"message-" + reply.event.event_id
	);
	if (!originalElement) {
		// TODO: find this message by loading older events
		return;
	}
	const originalElementBox = originalElement.getBoundingClientRect();
	if (
		originalElementBox.top < messageContainerBox.top ||
		originalElementBox.bottom > messageContainerBox.bottom
	) {
		originalElement?.scrollIntoView({
			behavior: "smooth",
		});
	}
	if (originalElement?.classList.contains("bg-accent-500")) {
		return;
	}
	originalElement?.classList.add("bg-accent-500");
	setTimeout(() => {
		originalElement?.classList.remove("bg-accent-500");
	}, 1000);
};

// Mark as read on visible
const messageRef = ref<HTMLDivElement | null>(null);
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

onMounted(() => {
	// When elements with data-user-id are clicked, open the user details
	messageRef.value
		?.querySelectorAll("span[data-user-id]")
		?.forEach(mention => {
			mention.addEventListener("click", () => {
				const userId = (mention as HTMLSpanElement).dataset.userId;
				if (!userId) return;
				store.state.viewingUser = userId;
			});
		});
});
</script>

<template>
	<div
		v-if="
			event.shouldShowMessage() ||
			event.isMessage() ||
			event.isMemberEvent()
		"
		:id="'message-' + message.getId()"
		ref="messageRef"
		:class="[
			'flex flex-col pb-1.5 pt-1 md:px-6 px-3 py-0 gap-1 hover:bg-accent-700 !bg-opacity-50 relative group duration-200',
			showHeader && 'mt-3',
		]">
		<div
			v-if="event.shouldShowMessage() && event.isMessage()"
			class="flex flex-row gap-4">
			<TwemojiParse v-if="reply?.sender">
				<button
					class="text-left flex flex-row gap-1 reply items-center text-sm pl-5"
					@click="scrollToOriginal">
					<div
						class="border-t-2 border-l-2 rounded-lt w-7 h-2 shrink-0 border-accent-500"></div>
					<img
						:src="
							new MatrixUser(
								reply.sender.userId,
								store.client as MatrixClient
							).getAvatarUrl()
						"
						class="h-4 w-4 rounded mb-1" />
					<span class="text-white mb-1">{{ reply.sender.name }}</span>
					<div
						v-if="event.isText()"
						class="text-accent-50 gap-2 mb-1 break-word line-clamp-1 text-ellipsis"
						v-html="replyBody.innerHTML"></div>
				</button>
			</TwemojiParse>
		</div>
		<div
			v-if="event.shouldShowMessage() && event.isMessage()"
			class="flex flex-row gap-4 w-full max-w-full">
			<div v-if="!showHeader" class="w-10 shrink-0"></div>
			<div
				v-if="showHeader"
				class="h-10 hover:-translate-y-1 duration-200 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0"
				@click="log(body)">
				<img
					:src="user.getAvatarUrl()"
					class="w-full h-full object-cover" />
			</div>
			<div
				:key="String(isLoading)"
				class="flex flex-col gap-1 text-sm grow"
				style="overflow-wrap: anywhere">
				<div v-if="showHeader" class="flex flex-row items-center gap-3">
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
						class="text-[#dbdee1] gap-2 break-word message-body whitespace-pre-wrap"
						v-html="body"></div>
				</TwemojiParse>
				<div
					v-if="
						event.getType() === 'm.bad.encrypted' ||
						event.getContent().cyphertext ||
						isLoading
					"
					class="text-gray-400 flex flex-row gap-x-2 items-center">
					<Spinner theme="accentDark" /> Decrypting...
				</div>
				<div
					v-if="event.isImage()"
					class="max-w-sm rounded shadow overflow-hidden">
					<img
						v-if="mediaUrl"
						:src="mediaUrl"
						class="w-full h-full object-fit"
						@click="store.lightboxElementUrl = mediaUrl" />
					<div
						v-else
						class="bg-gray-400 animate-pulse h-full w-full object-fit"
						:style="{
							aspectRatio:
								event.getContent().info.w /
								event.getContent().info.h,
						}"></div>
				</div>
				<div
					v-if="event.isVideo()"
					class="max-w-sm rounded shadow overflow-hidden">
					<MediaFvVideo
						:body="event.getContent().body"
						:file="event.getContent().file"
						:is-encrypted="event.event.isEncrypted()"
						:thumbnail-file="event.getContent().info.thumbnail_file"
						:thumbnail-info="event.getContent().info.thumbnail_info"
						:info="event.getContent().info" />
				</div>
				<!-- <div
					v-if="
						event.getType() === 'm.bad.encrypted' ||
						event.getContent().cyphertext ||
						!isLoading
					"
					class="text-gray-200 font-italic">
					<Icon
						name="ic:round-lock"
						class="align-baseline mb-0.5 mr-1" />Encrypted message
				</div> -->
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
			v-if="event.shouldShowMessage() && event.isMessage()"
			class="absolute right-10 -top-7 rounded children:p-2 bg-accent-900 hidden group-hover:flex flex-row overflow-hidden ring-1 ring-accent-700">
			<button
				class="flex items-center justify-center duration-200"
				@click="setReply">
				<Icon
					name="tabler:message-circle"
					class="text-gray-400 w-5 h-5 hover:text-gray-200 duration-200" />
			</button>
			<button
				v-if="event.event.sender?.userId === store.client?.getUserId()"
				class="flex items-center justify-center duration-200"
				@click="setEdit">
				<Icon
					name="tabler:pencil"
					class="text-gray-400 w-5 h-5 hover:text-gray-200 duration-200" />
			</button>
			<button
				class="flex items-center justify-center duration-200"
				@click="log(event)">
				<Icon
					name="tabler:bug"
					class="text-gray-400 w-5 h-5 hover:text-gray-200 duration-200" />
			</button>
		</div>

		<MessagesFvStateEvent
			v-if="event.isMemberEvent()"
			:event="event as MatrixMessage" />
	</div>
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

.message-body pre {
	padding: 0px !important;
	white-space: pre-wrap;
}

.message-body pre code {
	display: block !important;
}

.message-body ol {
	list-style-type: decimal;
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
