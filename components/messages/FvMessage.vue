<script setup lang="ts">
import { MatrixClient, MatrixEvent, MatrixEventEvent } from 'matrix-js-sdk';
import { MatrixUser } from '~/classes/User';
import { MatrixMessage } from "~/classes/Event";
import { useStore } from "~/utils/store";

const store = useStore();

const props = defineProps<{
	message: MatrixEvent;
	previousEvents?: MatrixEvent[];
}>();

const isLoading = ref(props.message.isBeingDecrypted());

const onDecrypted = () => {
	isLoading.value = false;
}

props.message.on(MatrixEventEvent.Decrypted, onDecrypted);

onUnmounted(() => {
	props.message.off(MatrixEventEvent.Decrypted, onDecrypted);
})

const user = new MatrixUser(props.message.event.sender ?? '', store.client as MatrixClient);
const event = ref(new MatrixMessage(props.message, store.client as MatrixClient));

// Show header if messages are separated by more than 5 hours
const showHeader = computed(() => props.previousEvents?.at(-1)?.sender?.userId !== user.id || ((event.value.event.getDate()?.getTime() ?? 0) - (props.previousEvents?.at(-1)?.getDate()?.getTime() ?? 0)) > 1000 * 60 * 60 * 5);

const color = await user.getUserColor();
const media_url = ref("");


if (event.value.isImage()) {
	media_url.value = await event.value.decryptAttachment() ?? ""
}

const timeAgo = useTimeAgo(event.value.event.getDate() ?? Date.now())



</script>

<template>
	<Transition enter-active-class="duration-100" enter-from-class="opacity-0 translate-y-5" enter-to-class="opacity-100 translate-x-0" >
	<div v-if="message" :class="['mb-3', showHeader && 'mt-3']">
		<div class="flex flex-row gap-2 w-full max-w-full" v-if="event.shouldShowMessage() && !event.isMemberEvent()">
			<div class="w-10 shrink-0" v-if="!showHeader">

			</div>
			<div v-else class="h-10 hover:-translate-y-1 duration-200 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0">
				<img :src="user.getAvatarUrl() ?? `https://api.dicebear.com/6.x/initials/svg?seed=${user.getDisplayName()}&fontWeight=900`" class="w-full h-full object-cover" />
			</div>
			<div :key="String(isLoading)" class="flex flex-col gap-1 text-sm grow overflow-hidden break-words">
				<div v-if="showHeader" :class="['font-semibold', color]">
					{{ user.getDisplayName() }}
				</div>
				<div class="text-gray-200 flex flex-col gap-2 break-word" v-html="(((event.getContent().formatted_body) ?? event.getContent().body) as string).split('\n').map(p => `<p>${p}</p>`).join('')"  v-if="event.isText()"></div>
				<div v-if="isLoading" class="text-gray-400 flex flex-row gap-x-2 items-center">
					<Spinner theme="orangeDark" /> Decrypting...
				</div>
				<div class="max-w-sm rounded shadow overflow-hidden" v-if="event.isImage()">
					<img :src="media_url" />
				</div>
				<div class="max-w-sm rounded shadow overflow-hidden" v-if="event.isVideo()">
					<MediaFvVideo :body="event.getContent().body" :file="event.getContent().file" :is-encrypted="event.event.isEncrypted()" :thumbnail_file="event.getContent().info.thumbnail_file" :thumbnail_info="event.getContent().info.thumbnail_info" :info="event.getContent().info"/>
				</div>
				<div class="text-gray-200 font-italic" v-if="event.getType() === 'm.bad.encrypted' || event.getContent().cyphertext">
					<Icon name="ic:round-lock" class="align-baseline mb-0.5 mr-1" />Encrypted message
				</div>
				<div class="text-red-200 font-semibold" v-if="event.isRedacted()">
					<Icon name="ic:round-do-not-disturb-alt" class="align-baseline mb-0.5 mr-1" />Redacted Event
				</div>
			</div>
			<div class="text-gray-400 text-xs w-20 shrink-0 text-right">
				<span v-if="showHeader">{{ timeAgo }}</span>
			</div>
		</div>
		<div v-if="event.isMemberEvent()" class="flex flex-row gap-2 font-italic text-gray-200 justify-center mx-auto text-sm">
			<div class="h-5 w-5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
				<img :src="event.getSenderAvatarUrl()" class="w-full h-full object-cover" />
			</div>
			{{ event.getSenderDisplayName() }} changed their profile
		</div>
	</div>
	</Transition>
</template>