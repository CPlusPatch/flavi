<script setup lang="ts">
const store = useStore();

const { width } = useWindowSize();
const sidebarDialog = ref<HTMLDivElement | null>(null);
const sidebarScroller = ref<HTMLDivElement | null>(null);
const sidebar = ref<HTMLDivElement | null>(null);

const { x: sidebarScrollerX } = useScroll(sidebarScroller, {
	behavior: "smooth",
	eventListenerOptions: {
		passive: true,
	},
});
const { lengthX, isSwiping } = useSwipe(sidebarDialog, {
	threshold: 200,
	passive: true,
});

const oldOffsetX = ref(0);

const clamp = (num: number, min: number, max: number) =>
	Math.min(Math.max(num, min), max);

const offsetX = computed(() =>
	clamp(
		isSwiping.value ? lengthX.value : 0,
		-width.value,
		store.state.sidebarOpen ? width.value : 0
	)
);

watch(offsetX, () => {
	if (offsetX.value !== 0) {
		oldOffsetX.value = offsetX.value;
	}
});

watch(isSwiping, () => {
	store.state.sidebarOpen = oldOffsetX.value < -width.value / 2;
});

watch(
	() => store.state.sidebarOpen,
	() => {
		sidebarScrollerX.value = store.state.sidebarOpen ? 0 : width.value;
	}
);

onMounted(() => {
	store.state.loaded = true;
	console.info("Loaded app");
});
</script>

<template>
	<div
		ref="sidebarDialog"
		class="!h-[100dvh] h-screen relative bg-accent-800 flex overflow-hidden flex-row divide-gray-400 p-0 font-['Inter']">
		<div
			ref="sidebarScroller"
			class="flex flex-row overflow-x-hidden z-100 max-w-screen w-full">
			<!-- <SidebarFvSidebar v-if="width > 768" /> -->

			<!-- <HeadlessTransitionRoot v-else appear :show="store.state.sidebarOpen"> -->
			<div ref="sidebar" class="z-10 flex duration-100">
				<SidebarFvSidebar />
			</div>
			<!-- </HeadlessTransitionRoot> -->

			<slot />
		</div>
	</div>
</template>
