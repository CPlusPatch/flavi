<script setup lang="ts">
import { MatrixClient } from 'matrix-js-sdk';
import { MatrixMessage } from '~/classes/Event';
import { MatrixUser } from '~/classes/User';
import { useStore } from '~/utils/store';

const store = useStore();

const props = defineProps<{
	event: MatrixMessage;
}>();

const user = new MatrixUser(props.event.event.sender?.userId ?? "", store.client as MatrixClient);
const log = () => console.error(props.event.event.getSender());
let action: "" | "nameChange" | "nameSet" | "nameRemove" |
	"join" | "leave" | "avatarChange" | "avatarSet" | "avatarRemove" |
	"avatarChange" | "setPowerLevels" | "setHistoryVisibility" |
	"setHistoryVisibility" | "setGuestAccess" = "";


switch (props.event.event.getType()) {
	case "m.room.member": {
		switch (props.event.content.membership) {
			// TODO: add invite, ban, leave too
			case "join": {
				if (props.event.prevContent.membership === "join") {
					if (props.event.content.displayname !== props.event.prevContent.displayname) {
						if (typeof props.event.content.displayname === "undefined") action = "nameRemove";
						else if (typeof props.event.prevContent.displayname === "undefined") action = "nameSet";
						else action = "nameChange";
					}
					if (props.event.content.avatar_url !== props.event.prevContent.avatar_url) {
						if (typeof props.event.content.avatar_url === "undefined") action = "avatarRemove";
						else if (typeof props.event.prevContent.avatar_url === "undefined") action = "avatarSet";
						else action = "avatarChange";
					}
				} else action = "join";
				break;
			}
		}
		break;
	}
	case "m.room.power_levels": {
		action = "setPowerLevels";
		break;
	}
	case "m.room.history_visibility": {
		action = "setHistoryVisibility";
		break;
	}
	case "m.room.guest_access": {
		action = "setGuestAccess";
		break;
	}
}

let ui = {
	join: {
		icon: "ic:round-subdirectory-arrow-right",
		text: "joined the room"
	},
	leave: {
		icon: "ic:round-subdirectory-arrow-left",
		text: "left the room"
	},
	nameChange: {
		icon: "ic:round-subdirectory-arrow-right",
		text: "changed their display name"
	},
	nameSet: {
		icon: "ic:round-subdirectory-arrow-right",
		text: "set their displayname"
	},
	nameRemove: {
		icon: "ic:round-subdirectory-arrow-right",
		text: "removed their display name"
	},
	avatarChange: {
		icon: "ic:round-image",
		text: "changed their avatar"
	},
	avatarSet: {
		icon: "ic:round-image",
		text: "set their avatar"
	},
	avatarRemove: {
		icon: "ic:round-image",
		text: "removed their avatar"
	},
	setPowerLevels: {
		icon: "ic:round-rule",
		text: "set permission rules"
	},
	setHistoryVisibility: {
		icon: "ic:round-timeline",
		text: "set history visibility"
	},
	setGuestAccess: {
		icon: "ic:round-supervised-user-circle",
		text: "set guest access"
	}
}
</script>

<template>
	<div v-if="action !== ''" class="flex flex-row gap-2 text-gray-100 justify-start items-center mx-auto text-sm">
		<Icon :name="ui[action].icon" class="w-5 h-5 text-gray-200 ml-5" />
		<div @click="log" class="h-5 w-5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
			<img :src="event.content.membership === 'join' ? event.getSenderAvatarUrl() : user.getAvatarUrl()" class="w-full h-full object-cover" />
		</div>
		<b class="font-semibold">{{ event.getSenderDisplayName() ?? user.getDisplayName() }}</b>{{ ui[action].text }}
	</div>
	
</template>