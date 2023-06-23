<script setup lang="ts">
import { IContent, MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { MatrixUser } from '~/classes/User';
import { useStore } from "~/utils/store";

const store = useStore();

const props = defineProps<{
	message: MatrixEvent;
	previousMessage?: IContent;
}>();

const user = new MatrixUser(props.message.event.sender ?? '', store.client as MatrixClient);

const _message = props.message;

await store.client?.decryptEventIfNeeded(_message);

const color = await user.getUserColor();
</script>

<template>
	<div v-if="message">
		<div class="flex flex-row gap-2 w-full max-w-full" v-if="_message.isRedacted() || _message.getContent().msgtype === 'm.text' || _message.getContent().msgtype === 'm.bad.encrypted' || _message.getContent().cyphertext">
			<div class="w-10 shrink-0" v-if="previousMessage?.sender?.userId === user.id">

			</div>
			<div v-else class="h-10 hover:-translate-y-1 duration-200 w-10 rounded-md overflow-hidden flex items-center justify-center shrink-0">
				<img :src="user.getAvatarUrl() ?? `https://api.dicebear.com/6.x/initials/svg?seed=${user.getDisplayName()}&fontWeight=900`" class="w-full h-full object-cover" />
			</div>
			<div class="flex flex-col gap-1 text-sm grow overflow-hidden break-words">
				<div v-if="previousMessage?.sender?.userId !== user.id" :class="['font-semibold', color]">
					{{ user.getDisplayName() }}
				</div>
				<div class="text-gray-200 flex flex-col gap-2" v-html="(_message.getContent().body as string).split('\n').map(p => `<p>${p}</p>`).join('')"  v-if="_message.getContent().msgtype === 'm.text'">
					
				</div>
				<div class="text-gray-200 font-italic" v-if="_message.getContent().msgtype === 'm.bad.encrypted' || _message.getContent().cyphertext">
					<Icon name="ic:round-lock" class="align-baseline mb-0.5 mr-1" />Encrypted message
				</div>
				<div class="text-red-200 font-semibold" v-if="_message.isRedacted()">
					<Icon name="ic:round-do-not-disturb-alt" class="align-baseline mb-0.5 mr-1" />Redacted Event
				</div>
			</div>
			<div class="text-gray-300 text-xs">
				{{ _message.getDate()?.getHours() }}:{{ _message.getDate()?.getMinutes() }}:{{ _message.getDate()?.getSeconds() }}
			</div>
		</div>
		<div v-if="_message.event.type === 'm.room.member'" class="flex flex-row gap-2 font-italic text-gray-200 justify-center mx-auto text-sm">
			<div class="h-5 w-5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
				<img :src="store.client?.mxcUrlToHttp(_message.getContent().avatar_url ?? '', 96, 96, 'scale') ?? 'https://placehold.co/400'" class="w-full h-full object-cover" />
			</div>
			{{ _message.getContent().displayname }} changed their profile
		</div>
	</div>
</template>