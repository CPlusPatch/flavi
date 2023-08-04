<script setup lang="ts">
import { MatrixClient, RoomEvent } from "matrix-js-sdk";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";
const store = useStore();

const client = store.client;
const spaces = ref<MatrixRoom[]>([]);

if (!client) throw createError("Client not working!");

const timelineChange = async () => {
	const rooms =
		((await store.client?.getJoinedRooms())?.joined_rooms
			.map(
				roomId =>
					client.getRoom(roomId) &&
					new MatrixRoom(roomId, client as MatrixClient)
			)
			.filter(a => a) as MatrixRoom[]) ?? [];

	spaces.value = rooms.filter(r => r.isSpace());
};

store.client?.on(RoomEvent.Timeline, timelineChange);

onUnmounted(() => {
	store.client?.off(RoomEvent.Timeline, timelineChange);
});

timelineChange();

onMounted(() => {
	store.state.loaded = true;
	console.info("Loaded app");
});

enum ViewTab {
	DirectMessages,
	Space,
	Rooms,
}

const currentTab = ref(ViewTab.DirectMessages);
const currentSpace = ref<MatrixRoom | null>(null);

const navigateSpace = (space: MatrixRoom) => {
	currentTab.value = ViewTab.Space;
	currentSpace.value = space;
};

const navigateDMs = () => {
	currentTab.value = ViewTab.DirectMessages;
	currentSpace.value = null;
};

const navigateRooms = () => {
	currentTab.value = ViewTab.Rooms;
	currentSpace.value = null;
};
</script>

<template>
	<div
		class="max-w-full w-full h-screen bg-dark-800 flex flex-row divide-gray-400 p-0 overflow-hidden font-['Inter']">
		<div
			class="w-16 bg-dark-950 shrink-0 md:flex flex-col items-center py-2 gap-3 hidden">
			<button
				class="h-10 w-10 rounded-md flex items-center ring-dark-600 hover:ring-1 bg-dark-800 duration-200 rounded hover:shadow-xl justify-center shrink-0 text-orange-100"
				@click="navigateDMs">
				<Icon name="tabler:mail" class="w-6 h-6" />
			</button>
			<button
				class="h-10 w-10 rounded-md flex items-center ring-dark-600 hover:ring-1 bg-dark-800 duration-200 rounded hover:shadow-xl justify-center shrink-0 text-orange-100"
				@click="navigateRooms">
				<Icon name="tabler:message" class="w-6 h-6" />
			</button>
			<SeparatorsFvSeparator />
			<TransitionGroup move-class="duration-200 transition-all">
				<button
					v-for="space of spaces"
					:key="space.id"
					class="h-10 w-10 hover:translate-x-1 duration-200 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow"
					@click="navigateSpace(space as MatrixRoom)">
					<img
						:src="
							space.getAvatarUrl() ??
							`https://api.dicebear.com/6.x/initials/svg?seed=${space.getName()}&chars=1`
						"
						class="w-full h-full object-cover" />
				</button>
			</TransitionGroup>
		</div>
		<div
			class="bg-dark-900 md:flex flex-col gap-1 overflow-hidden relative w-70 shrink-0 hidden">
			<SidebarDirectMessageView
				v-if="currentTab === ViewTab.DirectMessages" />
			<SidebarRoomsView v-else-if="currentTab === ViewTab.Rooms" />
			<SidebarSpaceView
				v-else-if="currentTab === ViewTab.Space && currentSpace"
				:key="(currentSpace as any)"
				:space="(currentSpace as MatrixRoom)" />
		</div>
		<slot />
	</div>
</template>
