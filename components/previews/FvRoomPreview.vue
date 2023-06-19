<script setup lang="ts">
import { MatrixEvent } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";

const props = defineProps<{
	room: MatrixRoom;
}>();

const client = useStore().client;

const messages = (await props.room.getMessages())
</script>

<template>
	<NuxtLink :to="`/room/${room.id}`" class="flex flex-row gap-2 duration-200">
		<div class="h-12 w-12 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow">
			<img :src="room.getAvatarUrl(96) ?? 'https://placehold.co/400'" class="w-full h-full object-cover" />
		</div>
		<div class="flex flex-col h-full justify-around text-sm">
			<h3 class="m-0 line-clamp-1 text-ellipsis text-gray-100 font-semibold" :title="room.getName()">{{ room.getName() }}</h3>
			<span class="text-gray-300 line-clamp-1" :title="messages[0].getContent().body">{{ messages[0].getContent().displayname }}: {{ messages[0].getContent().body }}</span>
		</div>
	</NuxtLink>
</template>