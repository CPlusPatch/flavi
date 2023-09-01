<script setup lang="ts">
import { ClientEvent, MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { MatrixMessage } from "~/classes/Event";
import { MatrixRoom } from "~/classes/Room";
import { MatrixUser } from "~/classes/User";

const visibility = useDocumentVisibility();
const route = useRoute();
const store = useStore();

const onEvent = async (event: MatrixEvent) => {
	const message = new MatrixMessage(event, store.client as MatrixClient);
	const room = new MatrixRoom(
		event.getRoomId() ?? "",
		store.client as MatrixClient
	);
	await event.getDecryptionPromise();
	if (
		(event.getRoomId() !== route.params.id ||
			visibility.value === "hidden") &&
		message.shouldShowMessage() &&
		event.getSender() !== store.client?.getUserId()
	) {
		const user = new MatrixUser(
			event.getSender() ?? "",
			store.client as MatrixClient
		);

		const { isSupported, show, onClick } = useWebNotification({
			title: room.isDirectMessage()
				? user.getDisplayName() ?? ""
				: `${user.getDisplayName() ?? ""} (${room.getName() ?? ""}})`,
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
