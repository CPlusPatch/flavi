<script setup lang="ts">
import { CryptoEvent } from "matrix-js-sdk";
import {
	VerificationRequest,
	VerificationRequestEvent,
} from "matrix-js-sdk/lib/crypto-api";

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

const offsetX = computed(() => (isSwiping.value ? lengthX.value : 0));

watch(offsetX, () => {
	if (offsetX.value !== 0) {
		oldOffsetX.value = offsetX.value;
	}
	sidebarScrollerX.value = offsetX.value;
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

const isVerified = ref(await store.client?.getCrypto()?.isCrossSigningReady());

const handleRequest = (request: VerificationRequest) => {
	request.on(VerificationRequestEvent.Change, async () => {
		isVerified.value = await store.client
			?.getCrypto()
			?.isCrossSigningReady();
	});
};

store.client?.on(CryptoEvent.VerificationRequest, handleRequest);

onMounted(() => {
	store.state.loaded = true;
	console.info("Loaded app");
});

onUnmounted(() => {
	store.client?.off(CryptoEvent.VerificationRequest, handleRequest);
});
</script>

<template>
	<div
		ref="sidebarDialog"
		class="!h-[100dvh] h-screen relative bg-accent-800 flex overflow-hidden flex-col divide-gray-400 p-0 font-['Inter']">
		<div
			v-if="!isVerified"
			class="px-4 py-2 text-center text-gray-50 text-sm bg-red-950">
			You are <strong class="font-semibold">not verified</strong>.
			Encrypted message history will not be available.
		</div>
		<div
			ref="sidebarScroller"
			class="flex flex-row grow overflow-x-hidden z-100 max-w-screen w-full">
			<!-- <SidebarFvSidebar v-if="width > 768" /> -->

			<!-- <HeadlessTransitionRoot v-else appear :show="store.state.sidebarOpen"> -->
			<div ref="sidebar" class="z-10 flex duration-100">
				<SidebarFvSidebar />
			</div>
			<!-- </HeadlessTransitionRoot> -->

			<slot />
		</div>
	</div>
	<VerificationVerificator />
</template>
