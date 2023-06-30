<script setup lang="ts">
// Thanks https://github.com/cinnyapp/cinny/blob/f14d70ea3508a8467c0a27b9d61c8ab6661054ab/src/client/state/RoomsInput.js for some code
import { MatrixRoom } from "~/classes/Room";
import { useStore } from "~/utils/store";
import { encryptAttachment } from 'browser-encrypt-attachment';
import { getBlobSafeMimeType } from "~/utils/mime";
import { encodeBlurhash } from "~/utils/blurhash";
import { getVideoThumbnail, loadVideo } from "~/utils/video";
import { UploadProgress } from "matrix-js-sdk";


const props = defineProps<{
	room: MatrixRoom;
}>();

const emit = defineEmits<{
	(event: "send", event_id: string): void
}>();

const store = useStore();

const messageBody = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const sending = ref(false);

const files = ref<File[]>([]);
const currentlyUploadingFileProgress = ref(0);

const uploadFile = async (file: File | Blob, progressHandler: (progress: UploadProgress) => void) => {
	let encryptInfo: any = {};
	let encryptBlob: any = {};

	const isEncryptedRoom = store.client?.isRoomEncrypted(props.room.id);

	if (isEncryptedRoom) {
		const buffer = await file.arrayBuffer();
		const encryptedResult = await encryptAttachment(buffer);

		encryptInfo = encryptedResult.info;
		encryptBlob = new Blob([encryptedResult.data]);
	}

	const response = await store.client?.uploadContent(isEncryptedRoom ? encryptBlob! : file, {
		progressHandler
	})

	if (isEncryptedRoom) {
		encryptInfo.url = response?.content_uri;
		if (file.type) encryptInfo.mimetype = file.type;
		return { file: encryptInfo };
	} else {
		return { url: response?.content_uri };
	}
}

const send = async (e: Event) => {
	const body = messageBody.value;

	sending.value = true;

	messageBody.value = "";
	
	if (files.value.length > 0) {
		const isEncryptedRoom = store.client?.isRoomEncrypted(props.room.id);
		
		files.value.forEach(async (file) => {
			let content: any = {};
	
			content.info = {
				mimetype: file.type,
				size: file.size
			}

			const fileType = getBlobSafeMimeType(file.type).slice(0, file.type.indexOf('/'));

			switch (fileType) {
				case "image": {
					const img: HTMLImageElement = await new Promise((resolve, reject) => {
						const img = new Image();
						img.onload = () => resolve(img);
						img.onerror = (err) => reject(err);
						img.src = URL.createObjectURL(file);
					});

					content.info.w = img.width;
					content.info.h = img.height;
					content.info["xyz.amorgan.blurhash"] = encodeBlurhash(img);

					content.msgtype = "m.image";
					content.body = file.name || "Image";

					break;
				}

				case "video": {
					const video = await loadVideo(file);

					content.info.w = video.videoWidth;
					content.info.h = video.videoHeight;
					content.info["xyz.amorgan.blurhash"] = encodeBlurhash(video);

					const thumbnailData = await getVideoThumbnail(video, video.videoWidth, video.videoHeight, "image/webp");
					const thumbnailUploadData = await uploadFile(thumbnailData.thumbnail!, () => {});

					content.info.thumbnail_info = thumbnailData.info;

					if (isEncryptedRoom) {
						content.info.thumbnail_file = thumbnailUploadData.file;
					} else {
						content.info.thumbnail_url = thumbnailUploadData.url;
					}

					break;
				}

				case "audio": {
					content.msgtype = "m.audio";
					content.body = file.name || "Audio";

					break;
				}

				default: {
					content.msgtype = "m.file";
					content.body = file.name || "File";
				}
			}

			const uploadData = await uploadFile(file, data => {
				currentlyUploadingFileProgress.value = data.loaded / data.total;
			});

			if (isEncryptedRoom) {
				content.file = uploadData.file;
			} else {
				content.url = uploadData.url;
			}
			
			await store.client?.sendMessage(props.room.id, content);

			files.value.splice(0, 1);
		});
	}

	if (body !== "") {
		const response = await store.client?.sendTextMessage(props.room.id, body);
		emit("send", response?.event_id ?? "");
	}

	sending.value = false;
}

const fileToURL = (f: File) => URL.createObjectURL(f);
</script>

<template>
	<form @submit.prevent="send" class="w-full bg-dark-900 flex flex-col px-2 gap-4 justify-between pb-7 pt-3">
		<div v-if="files.length > 0" class="flex justify-start gap-2 overflow-x-scroll no-scrollbar p-0.5">
			<TransitionGroup enter-active-class="duration-200 ease-in-out" enter-from-class="translate-y-10 opacity-0" enter-to-class="translate-y-0 opacity -100" leave-active-class="duration-200 ease-in-out" leave-from-class="scale-100 opacity-100" leave-to-class="scale-95 opacity-0">
				<div v-for="file of files" :key="file.name" :class="['h-30 overflow-hidden rounded relative ring-1 shrink-0 ring-dark-700',
					!file.type.includes('image') && 'w-30 flex items-center justify-center']">
					<ButtonFvButton @click="files = files.filter(f => f.name !== file.name)" theme="gray" class="!absolute !bg-dark-800 top-1 right-1 !p-1 !rounded-full">
						<Icon name="ic:round-close" />
					</ButtonFvButton>
					<img v-if="file.type.includes('image')" :src="fileToURL(file)" class="h-full" />
					<Icon v-else name="ic:round-insert-drive-file" class="text-white h-5 w-5" />
				</div>
			</TransitionGroup>
		</div>
		<div class="w-full flex items-center gap-2">
			<button class="p-1.5 duration-100 ring-dark-600 hover:ring-1 rounded hover:shadow-xl hover:bg-dark-800" @click.prevent="fileInput?.click()">
				<Icon name="ic:round-file-upload" class="h-6 w-6 text-white"/>
			</button>

			<input multiple type="file" ref="fileInput" class="w-0 h-0" @change="files = Array.from(($event.target as HTMLInputElement).files as any)" />

			<input v-model="messageBody" name="message" class="!bg-dark-800 rounded focus:ring-1 duration-200 grow py-2 px-3 text-sm ring-dark-600 outline-none focus:outline-none text-gray-100" :placeholder="`Message in ${room.getName()}`"/>
			<button :disabled="sending" type="submit" class="p-1.5 duration-100 ring-dark-600 hover:ring-1 rounded hover:shadow-xl hover:bg-dark-800">
				<Icon name="ic:round-send" class="h-6 w-6 text-white"/>
			</button>
		</div>
	</form>
</template>