<script setup lang="ts">
import { MatrixClient, MatrixEvent, MatrixEventEvent } from "matrix-js-sdk";
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

const onDecrypted = () => {
	isLoading.value = false;
};

props.message.on(MatrixEventEvent.Decrypted, onDecrypted);

onUnmounted(() => {
	props.message.off(MatrixEventEvent.Decrypted, onDecrypted);
});

const user = new MatrixUser(
	props.message.event.sender ?? "",
	store.client as MatrixClient
);
const event = ref(
	new MatrixMessage(props.message, store.client as MatrixClient)
);

// Show header if messages are separated by more than 5 hours
const isPreviousEventMessage =
	props.previousEvent?.getType() === "m.room.message";
const showHeader =
	!isPreviousEventMessage ||
	props.previousEvent.sender?.userId !== props.message.sender?.userId ||
	(event.value.event.getDate()?.getTime() ?? 0) -
		(props.previousEvent?.getDate()?.getTime() ?? 0) >
		1000 * 60 * 60 * 5;

const mediaUrl = ref("");

if (event.value.isImage()) {
	mediaUrl.value = (await event.value.decryptAttachment()) ?? "";
}

const timeAgo = useTimeAgo(event.value.event.getDate() ?? Date.now());

const room = new MatrixRoom(
	props.message.event.room_id ?? "",
	store.client as MatrixClient
);

const reply = room.room.findEventById(event.value.event.replyEventId ?? "");

const log = console.error;

const body = document.createElement("div");
const replyBody = document.createElement("div");

body.innerHTML = (
	(props.message.getContent().formatted_body ??
		props.message.getContent().body ??
		"") as string
)
	.replace(/<mx-reply.*>.*?<\/mx-reply>/gi, "")
	.split("\n")
	.map(p => `<p>${p}</p>`)
	.join("");

[...body.getElementsByTagName("img")].forEach(img => {
	img.src = store.client?.mxcUrlToHttp(img.src) ?? "";
});

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
</script>

<template>
	<Transition
		enter-active-class="duration-100"
		enter-from-class="opacity-0 translate-y-5"
		enter-to-class="opacity-100 translate-x-0">
		<div
			v-if="message"
			:class="['mb-3 flex flex-col gap-1', showHeader && 'mt-3']">
			<div class="flex flex-row gap-4">
				<div class="w-10 shrink-0"></div>
				<TwemojiParse v-if="reply">
					<div class="flex flex-row gap-1 items-center text-xs">
						<Icon
							name="material-symbols:reply-rounded"
							class="text-white" />
						<span class="text-white">hazel</span>
						<div
							v-if="event.isText()"
							class="text-dark-400 flex flex-col gap-2 break-word line-clamp-1 text-ellipsis"
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
					<TwemojiParse>
						<div
							v-if="event.isText()"
							class="text-[#dbdee1] flex flex-col gap-2 break-word message-body"
							v-html="body.innerHTML"></div>
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

img.twemojiParse {
	vertical-align: middle !important;
	height: 1.4em;
	width: 1.4em;
	display: inline;
	margin-top: -0.3rem;
}

.message-body > p:only-child > img:only-child {
	height: 40px !important;
	width: auto !important;
	display: inline;
}
</style>
