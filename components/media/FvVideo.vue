<script setup lang="ts">
import { decryptAttachment } from "browser-encrypt-attachment";
import { getBlobSafeMimeType } from "~/utils/mime";
import { useStore } from "~/utils/store";

const store = useStore();

const props = defineProps<{
	thumbnail_info: any;
	thumbnail_file: any;
	file?: any;
	isEncrypted: boolean;
	info: any;
}>();

const getMediaUrl = async (link: string, type: string, mediaDecryptionData?: any) => {
	const response = await fetch(link)

	if (mediaDecryptionData) {
		const decryptedData = await decryptAttachment(await response.arrayBuffer(), mediaDecryptionData);

		const blob = new Blob([decryptedData], {
			type: getBlobSafeMimeType(type)
		});

		return URL.createObjectURL(blob);
	} else {
		return URL.createObjectURL(await response.blob());
	}
}

const loading = ref(true);

const thumbnailUrl = props.thumbnail_info && await getMediaUrl(store.client?.mxcUrlToHttp(props.thumbnail_file.url ?? "") ?? "", props.thumbnail_info.mimetype, props.thumbnail_file);
</script>

<template>
	<div class="max-w-60">
		{{ loading && "Loading..." }}
		<img :src="thumbnailUrl" class="w-full h-full" />
	</div>
</template>