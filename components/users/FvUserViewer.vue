<script setup lang="ts">
import { Device, MatrixClient } from "matrix-js-sdk";
import { MatrixUser } from "~/classes/User";

const store = useStore();

const user = computed(
	() =>
		(store.state.viewingUser &&
			new MatrixUser(
				store.state.viewingUser,
				store.client as MatrixClient
			)) ||
		null
);

const devices = ref<[string, Device][]>([]);

watch(user, async () => {
	if (user) {
		const devices2 = await user.value?.getDevices();

		devices.value =
			[...(devices2?.get(user.value?.id ?? "") ?? new Map())] ?? [];
	}
});
</script>

<template>
	<HeadlessTransitionRoot as="template" :show="!!store.state.viewingUser">
		<HeadlessDialog
			as="div"
			class="relative z-600"
			@close="store.state.viewingUser = null">
			<HeadlessTransitionChild
				as="template"
				enter="ease-out duration-300"
				enter-from="opacity-0"
				enter-to="opacity-100"
				leave="ease-in duration-200"
				leave-from="opacity-100"
				leave-to="opacity-0">
				<div
					class="fixed inset-0 bg-dark-400 bg-opacity-75 transition-opacity" />
			</HeadlessTransitionChild>

			<div class="fixed inset-0 z-10 overflow-y-auto">
				<div
					class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
					<HeadlessTransitionChild
						as="template"
						enter="ease-out duration-300"
						enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
						enter-to="opacity-100 translate-y-0 sm:scale-100"
						leave="ease-in duration-200"
						leave-from="opacity-100 translate-y-0 sm:scale-100"
						leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
						<HeadlessDialogPanel
							class="relative transform overflow-hidden p-4 rounded-lg ring-1 ring-accent-700 bg-dark-500 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
							<Transition
								enter-from-class="translate-x-full"
								enter-to-class="translate-x-0"
								enter-active-class="duration-100"
								leave-active-class="duration-100"
								leave-from-class="translate-x-0"
								leave-to-class="-translate-x-full"
								mode="out-in">
								<div class="flex flex-col gap-5">
									<div class="flex flex-row gap-4 w-full">
										<div
											class="flex items-center justify-center h-15 w-15 rounded-xl overflow-hidden">
											<img
												:src="user?.getAvatarUrl()"
												class="w-full h-full object-cover" />
										</div>
										<div
											class="flex flex-col gap-1 justify-center text-gray-50">
											<h2 class="font-semibold text-lg">
												{{ user?.getDisplayName() }}
											</h2>
											<h3 class="text-sm">
												{{
													user?.getStatus() ??
													user?.getPresenceStatus()
												}}
											</h3>
										</div>
									</div>
									<div class="flex-col gap-3">
										<h2 class="text-gray-50 font-semibold">
											Devices
										</h2>
										<ul
											class="mt-3 rounded ring-1 ring-accent-900 no-scrollbar bg-accent-800 max-h-40 overflow-y-scroll flex flex-row flex-wrap gap-2 p-2">
											<li
												v-for="device of devices"
												:key="device[0]"
												class="bg-accent-900 rounded px-2 py-1 text-gray-200 text-sm font-mono">
												{{
													device[1].displayName ??
													device[1].deviceId
												}}
											</li>
										</ul>
									</div>
								</div>
							</Transition>
						</HeadlessDialogPanel>
					</HeadlessTransitionChild>
				</div>
			</div>
		</HeadlessDialog>
	</HeadlessTransitionRoot>
</template>
