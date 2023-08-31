<script setup lang="ts">
const store = useStore();

const { current } = useMagicKeys();

watch(current, () => {
	if ([...current.keys()].includes("escape") && store.lightboxElementUrl) {
		store.lightboxElementUrl = null;
	}
});
</script>

<template>
	<Transition
		enter-active-class="transition ease-in-out duration-300"
		enter-from-class="opacity-0"
		enter-to-class="opacity-100"
		leave-active-class="transition ease-in-out duration-300"
		leave-from-class="opacity-100"
		leave-to-class="opacity-0">
		<div
			v-if="store.lightboxElementUrl"
			class="fixed inset-0 flex items-center justify-center z-999 p-10 bg-black/70 backdrop-blur-lg"
			@click="store.lightboxElementUrl = null">
			<img
				:src="store.lightboxElementUrl"
				class="object-contain max-h-full rounded"
				@click="$event.stopPropagation()" />
		</div>
	</Transition>
</template>
