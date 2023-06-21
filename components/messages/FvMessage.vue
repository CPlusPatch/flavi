<script setup lang="ts">
import { MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { MatrixUser } from '~/classes/User';
import { useStore } from "~/utils/store";

const store = useStore();

const props = defineProps<{
	message: MatrixEvent;
	previousMessage?: MatrixEvent;
}>();

const user = new MatrixUser(props.message.event.sender ?? '', store.client as MatrixClient);

if (props.message.getContent().ciphertext) {
	await store.client?.decryptEventIfNeeded(new MatrixEvent(props.message.event));
}

const color = await user.getUserColor();
</script>

<template>
	<div>
		<div class="flex flex-row gap-2 w-full max-w-full" v-if="message.getContent().msgtype === 'm.text' || message.getContent().msgtype === 'm.bad.encrypted'">
			<div class="w-10 shrink-0" v-if="previousMessage?.sender?.userId === user.id">

			</div>
			<div v-else class="h-10 hover:-translate-y-1 duration-200 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0">
				<img :src="user.getAvatarUrl() ?? 'https://placehold.co/400'" class="w-full h-full object-cover" />
			</div>
			<div class="flex flex-col gap-1 text-sm grow overflow-hidden break-words">
				<div v-if="previousMessage?.sender?.userId !== user.id" :class="['font-semibold', color]">
					{{ user.getDisplayName() }}
				</div>
				<div class="text-gray-200 flex flex-col gap-2" v-html="(props.message.getContent().body as string).split('\n').map(p => `<p>${p}</p>`).join('')"  v-if="message.getContent().msgtype === 'm.text'">
					
				</div>
				<div class="text-gray-200 font-italic" v-if="message.getContent().msgtype === 'm.bad.encrypted'">
					<Icon name="ic:round-lock" class="align-baseline mb-0.5 mr-1" />Encrypted message
				</div>
			</div>
			<div class="text-gray-300 text-xs">
				2023/02/38
			</div>
		</div>
		<div v-if="message.event.type === 'm.room.member'" class="flex flex-row gap-2 font-italic text-gray-200 items-center mx-auto text-sm">
			<div class="h-5 w-5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
				<img :src="store.client?.mxcUrlToHttp(message.getContent().avatar_url ?? '', 96, 96, 'scale') ?? 'https://placehold.co/400'" class="w-full h-full object-cover" />
			</div>
			{{ message.getContent().displayname }} changed their profile
		</div>
	</div>
</template>