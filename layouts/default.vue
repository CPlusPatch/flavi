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

// Let the user swipe the sidebar to open/close it, if the user
// stops mid-swipe then automatically open/close it depending on
// where their finger is. This is a bit janky but it works.
// sidebarScrollerX controls the sidebar open/close UI
// The higher sidebarscrollX is, the more the sidebar is closed

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

const swiper = ref<any | null>(null);

const handleSwiper = (s: any) => {
	swiper.value = s;
};

watch(
	() => store.state.sidebarOpen,
	() => {
		if (store.state.sidebarOpen) {
			swiper.value?.slideTo(0);
		} else {
			swiper.value?.slideTo(1);
		}
	}
);
</script>

<template>
	<div
		ref="sidebarDialog"
		class="!h-[100dvh] h-screen relative bg-accent-800 flex overflow-hidden flex-col divide-gray-400 p-0">
		<div
			v-if="!isVerified"
			class="px-4 py-2 text-center text-gray-50 text-sm bg-red-950">
			You are <strong class="font-semibold">not verified</strong>.
			Encrypted message history will not be available.
		</div>
		<div
			ref="sidebarScroller"
			class="flex flex-row grow overflow-hidden z-100 max-w-screen w-full">
			<SidebarFvSidebar v-if="width > 768" />

			<slot v-if="width > 768" />

			<!-- <HeadlessTransitionRoot
				v-else
				appear
				:show="store.state.sidebarOpen">
				<HeadlessDialog @close="store.state.sidebarOpen = false">
					<HeadlessTransitionChild
						enter="transition ease-in-out duration-300 transform"
						enter-from="opacity-0"
						enter-to="opacity-100"
						leave="transition ease-in-out duration-300 transform"
						leave-from="opacity-100"
						leave-to="opacity-0"
						class="flex flex-row grow overflow-hidden z-100 max-w-screen w-full">
						<HeadlessDialogOverlay
							class="fixed inset-0 z-100 bg-dark-400/60" />
					</HeadlessTransitionChild>
					<HeadlessTransitionChild
						enter="transition ease-in-out duration-200 transform"
						enter-from="-translate-x-full"
						enter-to="translate-x-0"
						leave="transition ease-in-out duration-200 transform"
						leave-from="translate-x-0"
						leave-to="-translate-x-full"
						class="flex flex-row grow overflow-hidden z-100 max-w-screen w-full">
						<HeadlessDialogPanel
							class="fixed inset-0 z-100 flex flex-row">
							
						</HeadlessDialogPanel>
					</HeadlessTransitionChild>
				</HeadlessDialog>
			</HeadlessTransitionRoot> -->

			<Swiper
				v-else
				:slide-to-clicked-slide="true"
				slides-per-view="auto"
				:resistance-ratio="0"
				:initial-slide="1"
				@slide-change-transition-end="
					store.state.sidebarOpen = $event.activeIndex === 0
				"
				@swiper="handleSwiper">
				<SwiperSlide class="max-w-[21.5rem]">
					<div class="flex flex-row max-h-full">
						<SidebarFvSidebar />
					</div>
				</SwiperSlide>
				<SwiperSlide>
					<div class="flex flex-row overflow-hidden max-h-full">
						<slot />
					</div>
				</SwiperSlide>
			</Swiper>
		</div>
	</div>
	<VerificationVerificator />
</template>
