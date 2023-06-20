<script setup lang="ts">
import { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";
import { MatrixRoom } from "~/classes/Room";
import FvMessage from "~/components/messages/FvMessage.vue";
import FVInput from "~/components/input/FvInput.vue";
import FvButton from "~/components/button/FvButton.vue";

const id = useRoute().params.id as string;

const store = useStore();

if (!store.client) throw createError("Client not working");

const room = ref(new MatrixRoom(id, store.client as MatrixClient));
const messages = ref(room.value.getMessages());

store.client.on("Room.timeline" as any, (event: MatrixEvent, room2: Room) => {
	if (room2.roomId === room.value.id) {
		room.value = new MatrixRoom(room2.roomId, store.client as MatrixClient);
		messages.value = room.value.getMessages();
	}
});

const send = async () => {
	await store.client?.sendTextMessage(room.value.id, "Test");
}
</script>

<template>
	<div class="w-full max-h-full flex flex-col justify-between">
		<div class="grow max-w-full p-6 flex flex-col gap-6 overflow-scroll message-view">
			<FvMessage v-for="message of messages" :key="message.getId()" :message="(message as MatrixEvent)" />
			<div class="message-anchor"></div>
		</div>
		<div class="w-full">
			<div class="w-full h-15 bg-dark-950 flex items-center px-2 gap-2 justify-between">
				<FVInput icon="ic:round-message" wrapper-classes="grow" name="post" class="!bg-dark-900 !border-none" placeholder="Type here to send a post"/>
				<FvButton @click="send" theme="orange" class="!p-1.5">
					<Icon name="ic:round-send" class="h-6 w-6"/>
				</FvButton>
			</div>
		</div>
	</div>
</template>

<style>
.message-view * {
	overflow-anchor: none;
}

.message-anchor {
	overflow-anchor: auto;
	height: 1px;
}
</style>