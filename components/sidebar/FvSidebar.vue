<script setup lang="ts">
import { ClientEvent, MatrixClient } from "matrix-js-sdk";
import { useStore } from "~/utils/store";
import { MatrixRoom } from "~/classes/Room";
import { MatrixUser } from "~/classes/User";
const store = useStore();

const client = store.client;
const spaces = ref<MatrixRoom[]>([]);

const userId = useLocalStorage("userId", "");
const users = useLocalStorage<
	{
		id: string;
		avatar: string;
		name: string;
		accessToken: string;
		baseUrl: string;
		deviceId: string;
	}[]
>("users", []);
const currentUser = computed(
	() => users.value.find(u => u.id === userId.value) || null
);

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

store.client?.on(ClientEvent.Event, timelineChange);

onUnmounted(() => {
	store.client?.off(ClientEvent.Event, timelineChange);
});

timelineChange();

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

onMounted(() => {
	users.value = users.value.map(user => {
		if (user.id === currentUser.value?.id) {
			return {
				...user,
				avatar: new MatrixUser(
					currentUser.value.id,
					store.client as MatrixClient
				).getAvatarUrl(),
				name:
					new MatrixUser(
						currentUser.value.id,
						store.client as MatrixClient
					).getDisplayName() ?? currentUser.value.id,
			};
		}
		return user;
	});
});

const switchToAccount = (id: string) => {
	if (id === currentUser.value?.id) return;
	userId.value = id;
};
</script>

<template>
	<div
		class="w-16 bg-accent-950 shrink-0 flex flex-col items-center py-2 gap-3">
		<button
			class="h-10 w-10 rounded-md flex items-center ring-accent-600 hover:ring-1 bg-accent-800 duration-200 rounded hover:shadow-xl justify-center shrink-0 text-accent-100"
			@click="navigateDMs">
			<Icon name="tabler:mail" class="w-6 h-6" />
		</button>
		<button
			class="h-10 w-10 rounded-md flex items-center ring-accent-600 hover:ring-1 bg-accent-800 duration-200 rounded hover:shadow-xl justify-center shrink-0 text-accent-100"
			@click="navigateRooms">
			<Icon name="tabler:message" class="w-6 h-6" />
		</button>
		<SeparatorsFvSeparator />
		<div class="flex flex-col gap-3 grow overflow-y-scroll no-scrollbar">
			<button
				v-for="space of spaces"
				:key="space.id"
				class="h-10 w-10 duration-200 transition-transform hover:translate-x-1 duration-200 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow"
				@click="navigateSpace(space as MatrixRoom)">
				<img
					:src="
						space.getAvatarUrl() ??
						`https://api.dicebear.com/6.x/initials/svg?seed=${space.getName()}&chars=1`
					"
					class="w-full h-full object-cover" />
			</button>
		</div>
		<SeparatorsFvSeparator class="mt-auto" />

		<HeadlessMenu as="div" class="relative inline-block text-left">
			<HeadlessMenuButton
				class="h-10 w-10 duration-200 transition-transform hover:translate-x-1 duration-200 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow">
				<img
					:src="currentUser?.avatar ?? ''"
					class="w-full h-full object-cover" />
			</HeadlessMenuButton>

			<transition
				enter-active-class="transition duration-100 ease-out"
				enter-from-class="transform scale-95 opacity-0"
				enter-to-class="transform scale-100 opacity-100"
				leave-active-class="transition duration-75 ease-in"
				leave-from-class="transform scale-100 opacity-100"
				leave-to-class="transform scale-95 opacity-0">
				<HeadlessMenuItems
					class="absolute left-15 p-1 z-40 mt-2 bottom-0 w-56 flex flex-col gap-1 origin-bottom-left rounded-md bg-dark-400 shadow-lg ring-1 ring-dark-300 focus:outline-none">
					<HeadlessMenuItem
						v-for="user of users"
						:key="user.id"
						as="button"
						class="py-2 px-2 rounded hover:bg-accent-700 duration-200 items-center flex flex-row w-full gap-3"
						@click="switchToAccount(user.id)">
						<div
							class="h-10 w-10 flex items-center justify-center rounded-md overflow-hidden">
							<img :src="user.avatar" />
						</div>
						<div
							class="flex flex-col gap-1 text-xs justify-center grow text-left h-full">
							<h3
								class="font-semibold col-span-1 overflow-hidden text-ellipsis text-gray-50">
								{{ user.name }}
							</h3>
							<span class="text-gray-200">Click to switch</span>
						</div>
					</HeadlessMenuItem>
					<HeadlessMenuItem
						as="button"
						class="py-2 px-2 rounded hover:bg-accent-700 duration-200 items-center flex flex-row w-full gap-3">
						<div
							class="h-10 w-10 flex items-center justify-center rounded-md overflow-hidden bg-dark-200 text-accent-100">
							<Icon name="tabler:plus" />
						</div>
						<div
							class="flex flex-col gap-1 text-xs justify-center grow text-left h-full">
							<h3
								class="font-semibold col-span-1 overflow-hidden text-ellipsis text-gray-50">
								Add new
							</h3>
							<span class="text-gray-200">Click to switch</span>
						</div>
					</HeadlessMenuItem>
				</HeadlessMenuItems>
			</transition>
		</HeadlessMenu>
	</div>
	<div
		class="bg-accent-900 flex flex-col gap-1 overflow-hidden relative w-70 shrink-0">
		<Transition
			enter-from-class="-translate-x-full"
			enter-to-class="translate-x-0"
			enter-active-class="duration-100"
			leave-active-class="duration-100"
			leave-from-class="translate-x-0"
			leave-to-class="translate-x-full"
			mode="out-in">
			<SidebarDirectMessageView
				v-if="currentTab === ViewTab.DirectMessages" />
			<SidebarRoomsView v-else-if="currentTab === ViewTab.Rooms" />
			<SidebarSpaceView
				v-else-if="currentTab === ViewTab.Space"
				:key="currentSpace as any"
				:space="currentSpace as MatrixRoom" />
		</Transition>
	</div>
</template>
