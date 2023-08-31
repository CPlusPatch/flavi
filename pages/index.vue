<script setup lang="ts">
const store = useStore();
</script>

<template>
	<div
		class="flex overflow-x-hidden flex-row grow min-w-screen md:min-w-auto md:w-auto">
		<div class="grow min-w-0 max-h-full flex flex-col justify-between">
			<div
				class="w-full bg-accent-800 flex flex-row shadow border-b-1 border-accent-900 text-xl text-white items-center">
				<ButtonFvButton
					class="flex items-center justify-center h-full hover:bg-accent-700 !rounded-none !px-4 !py-2 md:hidden"
					@click="store.state.sidebarOpen = true">
					<Icon name="tabler:menu-2" class="w-5 h-5"
				/></ButtonFvButton>
				<div class="px-2 py-3 flex flex-row gap-2 items-center">
					<Icon name="tabler:hash" /><span>Home</span>
				</div>
			</div>
			<div class="w-full h-full flex flex-col p-4">
				<h1 class="text-gray-200 font-bold">
					Select a conversation to begin
				</h1>
			</div>
		</div>
	</div>
</template>
