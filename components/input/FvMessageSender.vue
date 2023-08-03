<script setup lang="ts">
// Thanks https://github.com/cinnyapp/cinny/blob/f14d70ea3508a8467c0a27b9d61c8ab6661054ab/src/client/state/RoomsInput.js for some code
import { encryptAttachment } from "browser-encrypt-attachment";
import { UploadProgress } from "matrix-js-sdk";
import emojis from "emoji.json";
import { MatrixRoom } from "~/classes/Room";
import { useStore } from "~/utils/store";
import { getBlobSafeMimeType } from "~/utils/mime";
import { encodeBlurhash } from "~/utils/blurhash";
import { getVideoThumbnail, loadVideo } from "~/utils/video";

const props = defineProps<{
	room: MatrixRoom;
}>();

const emit = defineEmits<{
	(event: "send", event_id: string): void;
}>();

const store = useStore();

const messageBody = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const sending = ref(false);

const files = ref<File[]>([]);
const currentlyUploadingFileProgress = ref(0);
const emojisSuggesterEmojis = ref<typeof emojis>([]);
const emojiPicker = ref<HTMLDivElement | null>(null);
const emojiFocusIndex = ref(-1);

const uploadFile = async (
	file: File | Blob,
	progressHandler: (progress: UploadProgress) => void
) => {
	let encryptInfo: any = {};
	let encryptBlob: any = {};

	const isEncryptedRoom = store.client?.isRoomEncrypted(props.room.id);

	if (isEncryptedRoom) {
		const buffer = await file.arrayBuffer();
		const encryptedResult = await encryptAttachment(buffer);

		encryptInfo = encryptedResult.info;
		encryptBlob = new Blob([encryptedResult.data]);
	}

	const response = await store.client?.uploadContent(
		isEncryptedRoom ? encryptBlob! : file,
		{
			progressHandler,
		}
	);

	if (isEncryptedRoom) {
		encryptInfo.url = response?.content_uri;
		if (file.type) encryptInfo.mimetype = file.type;
		return { file: encryptInfo };
	} else {
		return { url: response?.content_uri };
	}
};

const send = async () => {
	const body = messageBody.value;

	sending.value = true;

	messageBody.value = "";

	if (files.value.length > 0) {
		const isEncryptedRoom = store.client?.isRoomEncrypted(props.room.id);

		files.value.forEach(async file => {
			const content: any = {};

			content.info = {
				mimetype: file.type,
				size: file.size,
			};

			const fileType = getBlobSafeMimeType(file.type).slice(
				0,
				file.type.indexOf("/")
			);

			switch (fileType) {
				case "image": {
					const img: HTMLImageElement = await new Promise(
						(resolve, reject) => {
							const img = new Image();
							img.onload = () => resolve(img);
							img.onerror = err => reject(err);
							img.src = URL.createObjectURL(file);
						}
					);

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
					content.info["xyz.amorgan.blurhash"] =
						encodeBlurhash(video);

					const thumbnailData = await getVideoThumbnail(
						video,
						video.videoWidth,
						video.videoHeight,
						"image/webp"
					);
					const thumbnailUploadData = await uploadFile(
						thumbnailData.thumbnail!,
						() => {}
					);

					content.info.thumbnail_info = thumbnailData.info;

					if (isEncryptedRoom) {
						content.info.thumbnail_file = thumbnailUploadData.file;
					} else {
						content.info.thumbnail_url = thumbnailUploadData.url;
					}

					content.msgtype = "m.video";
					content.body = file.name || "Video";

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

			currentlyUploadingFileProgress.value = 0;

			files.value.splice(0, 1);
		});
	}

	if (body !== "") {
		let response;
		// If is a reply, send as a reply instead
		if (store.replies[props.room.id]) {
			const reply = store.replies[props.room.id];
			const content = {
				msgtype: "m.text",
				body,
				"m.relates_to": {
					"m.in_reply_to": {
						event_id: reply.eventId,
					},
				},
			};

			response = await store.client?.sendMessage(props.room.id, content);
			delete store.replies[props.room.id];
		} else {
			response = await store.client?.sendTextMessage(props.room.id, body);
		}
		emit("send", response?.event_id ?? "");
	}

	sending.value = false;
};

const pasteFile = (e: ClipboardEvent) => {
	files.value = [...(e.clipboardData?.files ?? files.value)];
};

const fileToURL = (f: File) => URL.createObjectURL(f);

const replaceEmoji = (emoji: string) => {
	messageBody.value = messageBody.value.replace(
		messageBody.value.match(/:[a-zA-Z0-9_]*((?<!:):$|$)/g)![0],
		emoji
	);

	emojisSuggesterEmojis.value = [];
	emojiFocusIndex.value = -1;
};

const preventOpeningFileDialog = (e: KeyboardEvent) => {
	if (e.key === "Enter") {
		e.preventDefault();
		if (emojiFocusIndex.value >= 0) {
			// Replace the half typed emoji with the actual emoji

			// const target = e.target as HTMLInputElement;

			replaceEmoji(
				emojisSuggesterEmojis.value[emojiFocusIndex.value].char
			);
		} else {
			send();
		}
	}
	if (e.key === "ArrowDown" || e.key === "ArrowUp") {
		if (emojisSuggesterEmojis.value.length > 0) {
			e.preventDefault();
		}
		if (emojisSuggesterEmojis.value.length === 1) {
			return (
				emojiPicker.value?.children[0] as HTMLDivElement
			).classList.add("bg-dark-800");
		}
		if (e.key === "ArrowDown") {
			emojiFocusIndex.value =
				(emojiFocusIndex.value + 1) %
				emojisSuggesterEmojis.value.length;
		} else if (e.key === "ArrowUp") {
			emojiFocusIndex.value =
				(emojiFocusIndex.value - 1) %
				emojisSuggesterEmojis.value.length;
		}
		for (let i = 0; i < emojisSuggesterEmojis.value.length; i++) {
			const emojiElement = emojiPicker.value?.children[
				i
			] as HTMLDivElement;
			if (i === emojiFocusIndex.value) {
				emojiElement.classList.add("bg-dark-800");
			} else {
				emojiElement.classList.remove("bg-dark-800");
			}
		}
	}
};

const onInput = (e: Event) => {
	const target = e.target as HTMLInputElement;

	// Match emoji characters that are half typed, such as ":plead" or ":face_with_r"
	const matched = target.value.match(/:[a-zA-Z0-9_]*((?<!:):$|$)/g);
	if (matched && matched.length > 0) {
		// Remove first ":" which is found when the regex is execited
		const emojiToSearchFor = matched[0].replace(":", "");

		emojisSuggesterEmojis.value = emojis
			.filter(e => e.name.replaceAll(" ", "_").includes(emojiToSearchFor))
			.slice(0, 10);
	} else {
		emojisSuggesterEmojis.value = [];
		emojiFocusIndex.value = -1;
	}
};

const eventReplyingTo = computed(
	() =>
		store.replies[props.room.id] &&
		props.room.room.findEventById(store.replies[props.room.id].eventId)
);
</script>

<template>
	<form class="w-full px-3 pb-7" @submit.prevent="send">
		<input
			ref="fileInput"
			multiple
			type="file"
			class="w-0 h-0 hidden"
			@change="
				files = Array.from(
					($event.target as HTMLInputElement).files as any
				)
			" />

		<div
			v-if="eventReplyingTo"
			class="w-full bg-dark-900 rounded-md text-sm text-white p-2">
			<div class="flex flex-row gap-1 items-center text-xs">
				<Icon
					name="material-symbols:reply-rounded"
					class="text-white" />
				<span class="text-white">{{
					eventReplyingTo.sender?.rawDisplayName
				}}</span>
				<div
					class="text-dark-400 flex flex-col gap-2 break-word line-clamp-1 text-ellipsis">
					{{ eventReplyingTo.getContent().body }}
				</div>
				<button
					class="ml-auto flex items-center justify-center hover:bg-dark-800"
					@click="delete store.replies[room.id]">
					<Icon name="tabler:x" class="text-white" />
				</button>
			</div>
		</div>

		<div
			class="!bg-dark-700 rounded-md gap-6 flex flex-col ring-1 relative duration-200 grow py-2 text-sm ring-dark-600 text-gray-100">
			<div
				v-if="files.length > 0"
				class="flex justify-start gap-2 overflow-x-scroll no-scrollbar p-2">
				<TransitionGroup
					enter-active-class="duration-200 ease-in-out"
					enter-from-class="translate-y-10 opacity-0"
					enter-to-class="translate-y-0 opacity -100"
					leave-active-class="duration-200 ease-in-out"
					leave-from-class="scale-100 opacity-100"
					leave-to-class="scale-95 opacity-0">
					<div
						v-for="(file, index) of files"
						:key="file.name"
						:class="[
							'overflow-hidden rounded relative shrink-0 bg-dark-800 p-2',
						]">
						<ButtonFvButton
							theme="gray"
							class="!absolute !bg-dark-800 top-1 right-1 !p-1 !rounded"
							@click="
								files = files.filter(f => f.name !== file.name)
							">
							<Icon name="ic:round-close" />
						</ButtonFvButton>
						<div
							:class="[
								'bg-dark-700 h-30',
								!file.type.includes('image') &&
									'w-30 flex items-center justify-center',
							]">
							<img
								v-if="file.type.includes('image')"
								:src="fileToURL(file)"
								class="h-full" />
							<Icon
								v-else
								name="ic:round-insert-drive-file"
								class="text-white h-5 w-5" />
							<div
								v-if="
									index === 0 &&
									currentlyUploadingFileProgress !== 0
								"
								class="absolute bottom-0 inset-x-0 h-2">
								<div
									class="h-full bg-orange-500"
									:style="{
										width: `${
											currentlyUploadingFileProgress * 100
										}%`,
									}"></div>
							</div>
						</div>
						<div class="pt-3 text-xs">
							{{ file.name }}
						</div>
					</div>
				</TransitionGroup>
			</div>

			<Transition
				enter-active-class="duration-200 ease-in-out"
				enter-from-class="translate-y-5 opacity-0"
				enter-to-class="translate-y-0 opacity-100"
				leave-active-class="duration-200 ease-in-out"
				leave-from-class="translate-y-0 opacity-100"
				leave-to-class="translate-y-5 opacity-0">
				<div
					v-if="emojisSuggesterEmojis.length > 0"
					ref="emojiPicker"
					class="absolute w-full bottom-12/10 flex flex-col gap-1 p-2 bg-dark-900 rounded-md ring-1 shadow ring-dark-700">
					<div
						v-for="emoji in emojisSuggesterEmojis"
						:key="emoji.char"
						class="flex items-center gap-2 rounded px-2 py-1.5 duration-200 hover:bg-dark-800"
						@click="replaceEmoji(emoji.char)">
						<Twemoji :emoji="emoji.char" /><span
							>:{{ emoji.name.replaceAll(" ", "_") }}:</span
						>
					</div>
				</div>
			</Transition>

			<div class="flex flex-row gap-2 mx-2">
				<button
					class="duration-100 ring-dark-600 hover:ring-1 rounded hover:shadow-xl hover:bg-dark-800"
					@click.prevent="fileInput?.click()">
					<Icon
						name="ic:round-file-upload"
						class="h-6 w-6 text-white" />
				</button>
				<input
					v-model="messageBody"
					name="message"
					class="bg-transparent w-full outline-none focus:outline-none"
					:placeholder="`Message in ${room.getName()}`"
					@input="onInput"
					@paste="pasteFile"
					@keydown="preventOpeningFileDialog" />

				<button
					:disabled="sending"
					type="submit"
					class="duration-100 ring-orange-800 !bg-orange-700 py-1 px-2 flex flex-row items-center gap-1 font-semibold rounded-md ring-1 rounded">
					<Icon name="tabler:send" class="h-5 h-5 text-white" />
				</button>
			</div>
		</div>
	</form>
</template>
