<script setup lang="ts">
import { decryptAttachment } from "browser-encrypt-attachment";
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

const getMediaUrl = async (
	link: string,
	type: string,
	mediaDecryptionData?: any
) => {
	const response = await fetch(link);

	if (mediaDecryptionData) {
		const decryptedData = await decryptAttachment(
			await response.arrayBuffer(),
			mediaDecryptionData
		);

		const blob = new Blob([decryptedData], {
			type: getBlobSafeMimeType(type),
		});

		return URL.createObjectURL(blob);
	} else {
		return URL.createObjectURL(await response.blob());
	}
};

const videoUrl = ref<string | null>(null);

const loadMedia = async () => {
	loading.value = true;

	videoUrl.value = await getMediaUrl(
		store.client?.mxcUrlToHttp(props.file.url ?? "") ?? "",
		props.info.mimetype,
		props.file
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
</script>

<template>
	<div class="relative rounded overflow-hidden max-w-60 group">
		<img
			v-if="!videoUrl"
			:src="thumbnailUrl"
			class="w-full h-full opacity-70 group-hover:scale-105 duration-500" />
		<video v-else :src="videoUrl" class="w-full h-full" controls />
		<ButtonFvButton
			v-if="!videoUrl"
			theme="gray"
			class="!p-1 !rounded-full !absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hover:scale-105"
			@click="loadMedia">
			<Icon v-if="!loading" name="ic:round-play-arrow" class="w-6 h-6" />
			<Spinner v-else theme="orangeDark" class="w-6 h-6" />
		</ButtonFvButton>
	</div>
</template>
