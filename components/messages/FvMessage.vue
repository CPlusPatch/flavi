<script setup lang="ts">
import { MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { MatrixUser } from '~/classes/User';
import { useStore } from "~/utils/store";

const store = useStore();

const props = defineProps<{
	message: MatrixEvent;
}>();

const user = new MatrixUser(props.message.event.sender ?? '', store.client as MatrixClient);

if (props.message.getContent().ciphertext) {
	await store.client?.decryptEventIfNeeded(new MatrixEvent(props.message.event));
}
</script>

<template>
	<div class="flex flex-row gap-2 w-full max-w-full" v-if="message.getContent().msgtype === 'm.text' || message.getContent()?.ciphertext">
		<div class="h-10 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0">
			<img :src="user.getAvatarUrl() ?? 'https://placehold.co/400'" class="w-full h-full object-cover" />
		</div>
		<div class="flex flex-col gap-1 text-sm grow overflow-hidden break-words">
			<div class="font-semibold text-gray-100">
				{{ user.getDisplayName() }}
			</div>
			<div class="text-gray-200 flex flex-col gap-2" v-html="(props.message.getContent().body as string).split('\n').map(p => `<p>${p}</p>`).join('')"  v-if="message.getContent().msgtype === 'm.text'">
				
			</div>
			<div class="text-gray-200 font-italic" v-if="message.getContent()?.ciphertext">
				<Icon name="ic:round-lock" class="align-baseline mb-0.5 mr-1" />Encrypted message
			</div>
		</div>
	</div>
	<div v-if="message.event.type === 'm.room.member'" class="flex flex-row gap-2 font-italic text-gray-200 items-center mx-auto text-sm">
		<div class="h-5 w-5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
			<img :src="store.client?.mxcUrlToHttp(message.getContent().avatar_url ?? '', 96, 96, 'scale') ?? 'https://placehold.co/400'" class="w-full h-full object-cover" />
		</div>
		{{ message.getContent().displayname }} changed their profile
	</div>
</template>