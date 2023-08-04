<script setup lang="ts">
const store = useStore();

const { width } = useWindowSize();
</script>

<template>
	<div
		class="max-w-full w-full h-screen bg-dark-800 flex flex-row divide-gray-400 p-0 overflow-hidden font-['Inter']">
		<SidebarFvSidebar v-if="width > 768" />

		<HeadlessTransitionRoot v-else appear :show="store.state.sidebarOpen">
			<HeadlessDialog as="div" class="overflow-hidden fixed inset-0 z-50">
				<div class="overflow-hidden absolute inset-0">
					<HeadlessTransitionChild
						enter="ease-in-out duration-300"
						enter-from="opacity-0"
						enter-to="opacity-100"
						leave="ease-in-out duration-300"
						leave-from="opacity-100"
						leave-to="opacity-0">
						<HeadlessDialogOverlay
							class="fixed inset-0 bg-gray-500/40 transition-opacity backdrop-blur-md" />
					</HeadlessTransitionChild>

					<div
						class="flex fixed inset-y-0 left-0 pr-10 max-w-full pointer-events-none font-inter">
						<HeadlessTransitionChild
							enter="transform transition ease-in-out duration-300 sm:duration-300"
							enter-from="-translate-x-full"
							enter-to="translate-x-0"
							leave="transform transition ease-in-out duration-300 sm:duration-300"
							leave-from="translate-x-0"
							leave-to="-translate-x-full"
							class="w-screen pointer-events-auto flex flex-row">
							<SidebarFvSidebar />
						</HeadlessTransitionChild>
					</div>
				</div>
			</HeadlessDialog>
		</HeadlessTransitionRoot>

		<slot />
	</div>
</template>
