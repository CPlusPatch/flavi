<script setup lang="ts">
import { ClientEvent, MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { MatrixMessage } from "~/classes/Event";
import { MatrixUser } from "~/classes/User";

const focused = useWindowFocus();
const route = useRoute();
const store = useStore();

const onEvent = async (event: MatrixEvent) => {
	const message = new MatrixMessage(event, store.client as MatrixClient);
	await event.getDecryptionPromise();
	if (
		(event.getRoomId() !== route.params.id || !focused.value) &&
		message.shouldShowMessage() &&
		event.getSender() !== store.client?.getUserId()
	) {
		const user = new MatrixUser(
			event.getSender() ?? "",
			store.client as MatrixClient
		);

		const { isSupported, show, onClick } = useWebNotification({
			title: user.getDisplayName() ?? "",
			body: message.getContent().body,
			icon: user.getAvatarUrl(),
		});

		onClick(() => {
			navigateTo(`/room/${route.params.id}`);
		});

		if (isSupported.value) show();
	}
};

store.client?.on(ClientEvent.Event, onEvent);

onUnmounted(() => {
	store.client?.off(ClientEvent.Event, onEvent);
});
</script>

<template>
	<div></div>
</template>
