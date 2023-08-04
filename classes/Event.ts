import { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { decryptAttachment } from "matrix-encrypt-attachment";

export class MatrixMessage {
	event: MatrixEvent;
	content: any;
	prevContent: any;
	private client: MatrixClient;

	constructor(event: MatrixEvent, client: MatrixClient) {
		this.content = event.getContent();
		this.prevContent = event.getPrevContent();
		this.event = event;
		this.client = client;
	}

	shouldShowMessage = () => {
		return (
			!this.event.isRedacted() ||
			["m.text", "m.image", "m.bad.encryption", "m.video"].includes(
				this.getType() ?? ""
			)
		);
	};

	getContent() {
		return this.event.getContent();
	}

	getType() {
		return this.event.getContent().msgtype;
	}

	getInitialsAvatarUrl = () => {
		return `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(
			this.getSenderDisplayName() ?? ""
		)}&fontWeight=900&chars=1`;
	};

	isRedacted = () => {
		return this.event.isRedacted();
	};

	isText = () => {
		return ["m.text", "m.notice"].includes(this.getType() ?? "");
	};

	isImage = () => {
		return this.getType() === "m.image";
	};

	isVideo = () => {
		return this.getType() === "m.video";
	};

	decryptAttachment = async () => {
		const content = this.getContent();

		const isEncrypted = !content.url;

		// Image URL is in a different place depending on if the message is encrypted or not
		const url = isEncrypted ? content.file.url : content.url;

		const link = this.client?.mxcUrlToHttp(url) ?? "";

		if (isEncrypted) {
			const media = await (await fetch(link)).arrayBuffer();
			const decrypted = await decryptAttachment(media, content.file);
			const blob = new Blob([decrypted], { type: content.file.mimetype });
			return URL.createObjectURL(blob);
		}

		return link;
	};

	isMemberEvent = () => {
		return this.event.event.type === "m.room.member";
	};

	isRoomEvent = () => {
		return [
			"m.room.create",
			"m.room.power_levels",
			"m.room.history_visibility",
			"m.room.guest_access",
			"m.room.encryption",
			"m.space.parent",
			"m.room.join_rules",
			"m.room.name",
		].includes(this.event.getType());
	};

	getSenderAvatarUrl = () => {
		return (
			this.client?.mxcUrlToHttp(this.getContent().avatar_url ?? "") ||
			this.getInitialsAvatarUrl()
		);
	};

	getSenderDisplayName = () => {
		return this.getContent().displayname;
	};
}
