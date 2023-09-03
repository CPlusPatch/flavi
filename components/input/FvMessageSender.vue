<script setup lang="ts">
// Thanks https://github.com/cinnyapp/cinny/blob/f14d70ea3508a8467c0a27b9d61c8ab6661054ab/src/client/state/RoomsInput.js for some code
import { MatrixClient } from "matrix-js-sdk";
import uneditedEmojis from "emoji.json";
import { matchSorter } from "match-sorter";
import { marked } from "marked";
import { MatrixRoom } from "~/classes/Room";
import { useStore } from "~/utils/store";
import { getBlobSafeMimeType } from "~/utils/mime";
import { setFileMetadata, uploadFile } from "~/utils/uploading";
import { MatrixUser } from "~/classes/User";

const props = defineProps<{
	room: MatrixRoom;
	typing: Set<string>;
}>();

const emit = defineEmits<{
	(event: "send", event_id: string): void;
}>();

const store = useStore();

// Get a list of the user;s custom emojis
const userEmojis = (
	store.client?.getAccountData("im.ponies.user_emotes")?.getContent() as {
		images: {
			[key: string]: { url: string };
		};
		pack: {
			avatar_url: string;
			display_name: string;
		};
	}
).images;

// Map userEmojis into a value like emojis
const userEmojisMapped = Object.entries(userEmojis).map(([key, value]) => ({
	name: key,
	url: value.url,
}));

const mainInput = ref<null | HTMLTextAreaElement>(null);
const messageBody = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const sending = ref(false);

const files = ref<File[]>([]);
const currentlyUploadingFileProgress = ref(0);
const emojis = uneditedEmojis.map(e => ({
	...e,
	name: e.name.replace(" ", "_"),
}));

// Mention picker
const mentionPicker = computed(() => {
	// Match half typed mentions, starting with an "@" symbol
	const matched = messageBody.value.match(/@[a-zA-Z0-9_:.]*$/g);
	if (matched && matched.length > 0) {
		// Remove first ":" which is found when the regex is execited
		const memberToSearchFor = matched[0].replace(":", "");
		return matchSorter(
			props.room.getMembers().map(m => m.id),
			memberToSearchFor
		)
			.slice(0, 30)
			.map(
				userId => new MatrixUser(userId, store.client as MatrixClient)
			);
	} else {
		pickerFocusIndex.value = -1;
		return [];
	}
});

const emojiPicker = computed<
	Array<(typeof emojis)[0] | (typeof userEmojisMapped)[0]>
>(() => {
	// Match emoji characters that are half typed, such as ":plead" or ":face_with_r"
	const matched = messageBody.value.match(/:[a-zA-Z0-9_]*((?<!:):$|$)/g);
	if (matched && matched.length > 0) {
		// Remove first ":" which is found when the regex is execited
		const emojiToSearchFor = matched[0].replace(":", "");
		return matchSorter([...emojis, ...userEmojisMapped], emojiToSearchFor, {
			keys: ["name"],
		}).slice(0, 30);
	} else {
		pickerFocusIndex.value = -1;
		return [];
	}
});
const pickerFocusIndex = ref(-1);

const send = async () => {
	if (sending.value) return false;
	const body = messageBody.value;

	if (isReplyingOrEditing.value === "editing") {
		// Return false if the reply is the same as the edited event
		if (eventEditing.value?.getContent().body.trim() === body.trim())
			return;
	}

	sending.value = true;

	messageBody.value = "";

	if (!mainInput.value) return;
	mainInput.value.style.height = "20px";

	if (files.value.length > 0) {
		const isEncryptedRoom = store.client?.isRoomEncrypted(props.room.id);

		const filesCopy = files.value;

		for (const file of filesCopy) {
			let content: any = {};

			content.info = {
				mimetype: file.type,
				size: file.size,
			};

			const fileType = getBlobSafeMimeType(file.type).slice(
				0,
				file.type.indexOf("/")
			);

			content = await setFileMetadata(
				content,
				file,
				fileType,
				isEncryptedRoom ?? false,
				store.client as MatrixClient
			);

			const uploadData = await uploadFile(
				file,
				data => {
					currentlyUploadingFileProgress.value =
						data.loaded / data.total;
				},
				isEncryptedRoom ?? false,
				store.client as MatrixClient
			);

			if (isEncryptedRoom) {
				content.file = uploadData.file;
			} else {
				content.url = uploadData.url;
			}

			await store.client?.sendMessage(props.room.id, content);

			currentlyUploadingFileProgress.value = 0;

			files.value.splice(0, 1);
		}

		files.value = [];
	}

	if (body !== "") {
		const content: any = {
			msgtype: "m.text",
			body,
		};

		// If is a reply, send as a reply instead
		if (isReplyingOrEditing.value === "replying") {
			const reply = store.replies[props.room.id];
			content["m.relates_to"] = {
				"m.in_reply_to": {
					event_id: reply.eventId,
				},
			};
			delete store.replies[props.room.id];
		} else if (isReplyingOrEditing.value === "editing") {
			const edit = store.edits[props.room.id];
			content["m.new_content"] = { ...content };
			content["m.relates_to"] = {
				event_id: edit.eventId,
				rel_type: "m.replace",
			};
			delete store.edits[props.room.id];
		}

		let customEmojisFound = 0;
		userEmojisMapped.forEach(userEmoji => {
			if (content.body.includes(`:${userEmoji.name}:`)) {
				customEmojisFound++;
			}
		});

		let mentionsFound = 0;
		props.room.getMembers().forEach(member => {
			if (content.body.includes(`${member.id}`)) {
				mentionsFound++;
			}
		});

		if (
			marked(body) !== body ||
			customEmojisFound > 0 ||
			mentionsFound > 0
		) {
			content.format = "org.matrix.custom.html";
			content.formatted_body = marked(body).trim();

			userEmojisMapped.forEach(userEmoji => {
				content.formatted_body = content.formatted_body.replace(
					new RegExp(`:${userEmoji.name}:`, "g"),
					`<img data-mx-emoticon src="${userEmoji.url}" alt=":${userEmoji.name}:" title=":${userEmoji.name}:" height="32" />`
				);
			});

			props.room.getMembers().forEach(member => {
				content.formatted_body = content.formatted_body.replace(
					new RegExp(`${member.id}`, "g"),
					`<a href="https://matrix.to/#/${encodeURIComponent(
						member.id
					)}">${member.getDisplayName() ?? member.id}</a>`
				);
			});
		}

		sending.value = false;
		const response = await store.client?.sendMessage(
			props.room.id,
			content
		);
		emit("send", response?.event_id ?? "");
	}
};

const pasteFile = (e: ClipboardEvent) => {
	files.value = [...(e.clipboardData?.files ?? files.value)];
};

const fileToURL = (f: File) => URL.createObjectURL(f);

const replaceEmoji = (emojiName: string) => {
	const emoji = [...emojis, ...userEmojisMapped].find(
		e => e.name === emojiName
	) as any;

	const replaceTo: string = emoji.char
		? `${emoji.char} `
		: `:${emoji.name}: `;

	messageBody.value = messageBody.value.replace(
		messageBody.value.match(/:[a-zA-Z0-9_]*((?<!:):$|$)/g)![0],
		replaceTo
	);

	pickerFocusIndex.value = -1;
};

const replaceMention = (userId: string) => {
	messageBody.value = messageBody.value.replace(
		messageBody.value.match(/@[a-zA-Z0-9_:.]*$/g)![0],
		`${userId} `
	);

	pickerFocusIndex.value = -1;
};

const keys = useMagicKeys();
const leftArrow = keys.ArrowLeft;
const rightArrow = keys.ArrowRight;
const enter = keys.Enter;
const shift = keys.Shift;

watch(leftArrow, () => {
	if (
		(mentionPicker.value.length > 0 || emojiPicker.value.length > 0) &&
		leftArrow.value
	) {
		pickerFocusIndex.value = Math.max(pickerFocusIndex.value - 1, 0);
	}
});

watch(rightArrow, () => {
	if (
		(mentionPicker.value.length > 0 || emojiPicker.value.length > 0) &&
		rightArrow.value
	) {
		pickerFocusIndex.value = Math.min(
			pickerFocusIndex.value + 1,
			(mentionPicker.value.length > 0
				? mentionPicker.value.length
				: emojiPicker.value.length) - 1
		);
	}
});

watch(enter, () => {
	// Depending on which picker is opened, insert the selected emoji/mention
	if (sending.value) return false;
	if (mentionPicker.value.length > 0 && enter.value) {
		const user = mentionPicker.value[pickerFocusIndex.value];
		replaceMention(user.id);
	} else if (emojiPicker.value.length > 0 && enter.value) {
		const emoji = emojiPicker.value[pickerFocusIndex.value];
		replaceEmoji(emoji.name);
	} else if (
		enter.value &&
		emojiPicker.value.length === 0 &&
		mentionPicker.value.length === 0 &&
		!shift.value &&
		!sending.value
	) {
		send();
	}
});

const preventOpeningFileDialog = (e: KeyboardEvent) => {
	if (
		(e.key === "ArrowRight" || e.key === "ArrowLeft") &&
		(mentionPicker.value.length > 0 || emojiPicker.value.length > 0)
	) {
		e.preventDefault();
	}

	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
	}
};

const onInput = (e: Event) => {
	const target = e.target as HTMLInputElement;

	target.style.height = "20px";
	target.style.height = `${target.scrollHeight}px`;
};

const preloadUserEmojis = () => {
	userEmojisMapped.forEach(emoji => {
		const img = new Image();
		img.src = store.client?.mxcUrlToHttp(emoji.url) ?? "";
	});
};

const eventReplyingTo = computed(
	() =>
		store.replies[props.room.id] &&
		props.room.room.findEventById(store.replies[props.room.id].eventId)
);

const eventEditing = computed(
	() =>
		store.edits[props.room.id] &&
		props.room.room.findEventById(store.edits[props.room.id].eventId)
);

const isReplyingOrEditing = computed(() => {
	// Editing takes precedence over replying
	if (
		(eventEditing.value && eventReplyingTo.value) ||
		(eventEditing.value && !eventReplyingTo.value)
	)
		return "editing";
	else if (eventReplyingTo.value) return "replying";
	else return null;
});

watch(eventEditing, () => {
	// Set text to event's text
	if (eventEditing.value) {
		messageBody.value = eventEditing.value.getContent().body;
	}
});

watch([eventReplyingTo, eventEditing], () => {
	mainInput.value?.focus();
});

watch(files, () => {
	mainInput.value?.focus();
	console.error(files.value);
});

onMounted(() => {
	preloadUserEmojis();
});

onStartTyping(() => {
	if (document.activeElement !== mainInput.value) mainInput.value!.focus();
});
</script>

<template>
	<form autocomplete="off" class="w-full px-3" @submit.prevent="send">
		<input
			ref="fileInput"
			multiple
			type="file"
			class="w-0 h-0 hidden"
			@input="
				e => {
					files = Array.from(
						(e.target as HTMLInputElement).files as any
					);
					fileInput!.value = '';
				}
			" />

		<div
			v-if="isReplyingOrEditing === 'replying'"
			class="w-full bg-accent-900 rounded-md text-sm text-white p-2">
			<div class="flex flex-row gap-1 items-center text-xs">
				<Icon
					name="material-symbols:reply-rounded"
					class="text-white flex-shrink-0" />
				<span class="text-white">{{
					eventReplyingTo?.sender?.rawDisplayName
				}}</span>
				<div class="text-accent-50 gap-2 break-word line-clamp-1">
					{{ eventReplyingTo?.getContent().body }}
				</div>
				<button
					class="ml-auto flex items-center justify-center hover:bg-accent-800"
					@click="delete store.replies[room.id]">
					<Icon name="tabler:x" class="text-white" />
				</button>
			</div>
		</div>

		<div
			v-if="isReplyingOrEditing === 'editing'"
			class="w-full bg-accent-900 rounded-md text-sm text-white p-2">
			<div class="flex flex-row gap-1 items-center text-xs">
				<Icon
					name="material-symbols:edit"
					class="text-white flex-shrink-0" />
				<span class="text-white">{{
					eventEditing?.sender?.rawDisplayName
				}}</span>
				<div class="text-accent-50 gap-2 break-word line-clamp-1">
					{{ eventEditing?.getContent().body }}
				</div>
				<button
					class="ml-auto flex items-center justify-center hover:bg-accent-800"
					@click="delete store.edits[room.id]">
					<Icon name="tabler:x" class="text-white" />
				</button>
			</div>
		</div>

		<div
			class="!bg-accent-700 rounded-md gap-6 flex flex-col ring-1 relative duration-200 grow py-2 text-sm ring-accent-600 text-gray-100">
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
							'overflow-hidden rounded relative shrink-0 bg-accent-800 p-2',
						]">
						<ButtonFvButton
							theme="gray"
							class="!absolute !bg-accent-800 top-1 right-1 !p-1 !rounded"
							@click="
								files = files.filter(f => f.name !== file.name)
							">
							<Icon name="ic:round-close" />
						</ButtonFvButton>
						<div
							:class="[
								'bg-accent-700 h-30',
								!file.type.includes('image') &&
									'w-30 flex items-center justify-center',
							]">
							<img
								v-if="file.type.includes('image')"
								:src="fileToURL(file)"
								class="h-full w-full object-cover" />
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
									class="h-full bg-accent-500"
									:style="{
										width: `${
											currentlyUploadingFileProgress * 100
										}%`,
									}"></div>
							</div>
						</div>
						<div
							class="pt-3 text-xs max-w-40 whitespace-nowrap text-ellipsis overflow-hidden">
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
					v-if="emojiPicker.length > 0"
					class="absolute w-full overflow-x-scroll no-scrollbar bottom-12/10 flex flex-row gap-1 p-2 bg-accent-900 rounded-md ring-1 shadow ring-accent-700">
					<button
						v-for="(emoji, index) in emojiPicker"
						:key="(emoji as any).char || emoji.name"
						:class="[
							'flex items-center gap-2 rounded px-2 py-1.5 duration-200 hover:bg-accent-800 shrink-0',
							pickerFocusIndex === index && '!bg-accent-800',
						]"
						:title="emoji.name"
						type="button"
						@click="replaceEmoji(emoji.name)">
						<Twemoji
							v-if="(emoji as any).char"
							:emoji="(emoji as any).char"
							size="25" />
						<img
							v-else
							:src="
								store.client?.mxcUrlToHttp(
									(emoji as any).url
								) ?? ''
							"
							class="w-[25px] h-[25px]" />
					</button>
				</div>
			</Transition>

			<Transition
				enter-active-class="duration-200 ease-in-out"
				enter-from-class="translate-y-5 opacity-0"
				enter-to-class="translate-y-0 opacity-100"
				leave-active-class="duration-200 ease-in-out"
				leave-from-class="translate-y-0 opacity-100"
				leave-to-class="translate-y-5 opacity-0">
				<div
					v-if="mentionPicker.length > 0"
					class="absolute w-full overflow-x-scroll no-scrollbar bottom-12/10 flex flex-row gap-1 p-2 bg-accent-900 rounded-md ring-1 shadow ring-accent-700">
					<button
						v-for="(user, index) in mentionPicker"
						:key="user.id"
						:class="[
							'flex items-center gap-2 rounded px-2 py-1.5 duration-200 hover:bg-accent-800 shrink-0',
							pickerFocusIndex === index && '!bg-accent-800',
						]"
						:title="user.getDisplayName() || ''"
						type="button"
						@click="replaceMention(user.id)">
						<img
							:src="user.getAvatarUrl()"
							class="w-[25px] h-[25px] rounded" />
					</button>
				</div>
			</Transition>

			<div class="flex flex-row gap-2 mx-2 items-center">
				<button
					class="duration-100 ring-accent-600 hover:ring-1 rounded hover:shadow-xl hover:bg-accent-800"
					@click.prevent="fileInput?.click()">
					<Icon
						name="ic:round-file-upload"
						class="h-6 w-6 text-white" />
				</button>
				<textarea
					ref="mainInput"
					v-model="messageBody"
					name="message"
					:disabled="sending"
					style="max-height: 200px; height: 20px; overflow-y: hidden"
					class="bg-transparent w-full outline-none focus:outline-none mx-0 mb-0 resize-none border-0 !ring-0 p-0"
					:placeholder="`Message in ${room.getName()}`"
					rows="1"
					@input="onInput"
					@paste="pasteFile"
					@keydown="preventOpeningFileDialog"></textarea>

				<button
					:disabled="sending"
					type="submit"
					class="duration-100 ring-accent-800 !bg-accent-900 py-1 px-2 flex flex-row items-center gap-1 font-semibold rounded-md ring-1 rounded">
					<!-- <Icon name="tabler:send" class="h-5 h-5 text-white" /> -->
					Send
				</button>
			</div>
		</div>

		<div
			class="h-7 text-xs flex flex-row gap-1 text-gray-300 p-1 items-center">
			<span v-if="[...typing].length > 0">
				<strong>{{
					[...typing]
						.map(t => store.client?.getUser(t)?.displayName)
						.join(", ")
				}}</strong>
				{{ [...typing].length === 1 ? "is" : "are" }} typing...
			</span>
		</div>
	</form>
</template>
