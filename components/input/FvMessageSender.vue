<script setup lang="ts">
import { MatrixRoom } from "~/classes/Room";
import { useStore } from "~/utils/store";

const props = defineProps<{
	room: MatrixRoom;
}>();

const emit = defineEmits<{
	(event: "send", event_id: string): void
}>();

const store = useStore();

const messageBody = ref("");

const send = async (e: Event) => {
	const body = messageBody.value;
	messageBody.value = "";
	if (body !== "") {
		const response = await store.client?.sendTextMessage(props.room.id, body);
		emit("send", response?.event_id ?? "");
	}
}
</script>

<template>
	<form @submit.prevent="send" class="w-full bg-dark-900 flex items-center px-2 gap-2 justify-between pb-7 pt-3">
		<button class="p-1.5 hover:scale-102 duration-100">
			<Icon name="ic:round-file-upload" class="h-6 w-6 text-white"/>
		</button>
		<input v-model="messageBody" name="message" class="!bg-dark-800 rounded-lg grow py-2 px-3 text-sm ring-0 outline-none focus:outline-none text-gray-100" placeholder="What's on your mind?"/>
		<button type="submit" class="p-1.5 hover:scale-102 duration-100">
			<Icon name="ic:round-send" class="h-6 w-6 text-white"/>
		</button>
	</form>
</template>