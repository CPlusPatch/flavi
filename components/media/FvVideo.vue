<script setup lang="ts">
import { decryptAttachment } from "matrix-encrypt-attachment";
import fetchProgress from "fetch-progress";
import { getBlobSafeMimeType } from "~/utils/mime";
import { useStore } from "~/utils/store";

const store = useStore();

const props = defineProps<{
	thumbnailInfo: any;
	thumbnailFile: any;
	file?: any;
	isEncrypted: boolean;
	info: any;
	body: string;
}>();

const downloadProgress = ref<number | null>(null);

const getMediaUrl = async (
	link: string,
	type: string,
	mediaDecryptionData?: any,
	changeProgress = false
) => {
	return await fetch(link)
		.then(
			changeProgress
				? fetchProgress({
						onProgress(progress) {
							if (changeProgress)
								downloadProgress.value =
									progress.transferred / progress.total;
						},
				  })
				: res => res
		)
		.then(async response => {
			if (mediaDecryptionData) {
				const decryptedData = await decryptAttachment(
					await response.arrayBuffer(),
					mediaDecryptionData
				);

				const blob = new Blob([decryptedData], {
					type: getBlobSafeMimeType(type),
				});

				downloadProgress.value = 0;

				return URL.createObjectURL(blob);
			} else {
				return URL.createObjectURL(await response.blob());
			}
		});
};

const videoUrl = ref<string | null>(null);

const loadMedia = async () => {
	loading.value = true;

	videoUrl.value = await getMediaUrl(
		store.client?.mxcUrlToHttp(props.file.url ?? "") ?? "",
		props.info.mimetype,
		props.file,
		true
	);

	loading.value = false;
};

const loading = ref(false);

const thumbnailUrl =
	props.thumbnailInfo &&
	(await getMediaUrl(
		store.client?.mxcUrlToHttp(props.thumbnailFile.url ?? "") ?? "",
		props.thumbnailInfo.mimetype,
		props.thumbnailFile
	));

function shortenBytes(n: number) {
	const k = n > 0 ? Math.floor(Math.log2(n) / 10) : 0;
	const rank = (k > 0 ? "KMGT"[k - 1] : "") + "B";
	const count = Math.floor(n / Math.pow(1024, k));
	return count + " " + rank;
}
</script>

<template>
	<div class="relative rounded overflow-hidden max-w-60 group">
		<img
			v-if="!videoUrl"
			:src="thumbnailUrl"
			class="w-full h-full opacity-70 group-hover:scale-105 duration-500" />
		<video v-else :src="videoUrl" class="w-full h-full" controls />
		<div
			v-if="!videoUrl"
			class="absolute inset-0 to-black/50 from-transparent bg-gradient-to-b from-70%"></div>
		<ButtonFvButton
			v-if="!videoUrl"
			theme="gray"
			class="!p-1 !rounded-full !absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hover:scale-105"
			@click="loadMedia">
			<Icon v-if="!loading" name="ic:round-play-arrow" class="w-6 h-6" />
			<Spinner v-else theme="orangeDark" class="w-6 h-6" />
		</ButtonFvButton>
		<div
			v-if="!videoUrl"
			class="absolute bottom-2 left-2 flex flex-row gap-2 items-center">
			<svg width="27" height="27" viewBox="0 0 27 27">
				<circle
					class="stroke-white/20"
					cx="13.5"
					cy="13.5"
					r="10"
					fill="none"
					stroke-width="3"></circle>
				<circle
					class="stroke-orange-500"
					cx="13.5"
					cy="13.5"
					r="10"
					fill="none"
					stroke-width="3.5"
					stroke-linecap="round"
					:style="{
						strokeDashoffset:
							62.8319 * (1 - (downloadProgress ?? 0.0)),
						strokeDasharray: 62.8319,
					}"></circle>
			</svg>
			<span class="font-semibold text-gray-200 text-shadow">
				{{ shortenBytes(info.size) }}</span
			>
		</div>
	</div>
</template>
