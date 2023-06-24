import { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import encrypt from "browser-encrypt-attachment";

export class MatrixMessage {
	event: MatrixEvent;
	private client: MatrixClient;

	constructor(event: MatrixEvent, client: MatrixClient) {
		this.event = event;
		this.client = client;
	}

	shouldShowMessage = () => {
		return (
			!this.event.isRedacted() ||
			["m.text", "m.image", "m.bad.encryption"].includes(
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
		return `https://api.dicebear.com/6.x/initials/svg?seed=${this.getSenderDisplayName()}&fontWeight=900`;
	};

	isRedacted = () => {
		return this.event.isRedacted();
	}

	isText = () => {
		return this.getType() === "m.text"
	}

	isImage = () => {
		return this.getType() === "m.image";
	};

	decryptAttachment = async () => {
		const content = this.getContent()

		const isEncrypted = !content.url;

		// Image URL is in a different place depending on if the message is encrypted or not
		const url = isEncrypted ? content.file.url : content.url
		
		const link = this.client?.mxcUrlToHttp(url) ?? "";

		if (isEncrypted) {
			const media = await (await fetch(link)).arrayBuffer();
			const decrypted = await encrypt.decryptAttachment(media, content.file);
			const blob = new Blob([decrypted], { type: content.file.mimetype });
			return URL.createObjectURL(blob);
		}

		return link;
	};

	isMemberEvent = () => {
		return this.event.event.type === "m.room.member";
	};

	getSenderAvatarUrl = () => {
		return (
			this.client?.mxcUrlToHttp(this.getContent().avatar_url ?? "",) ?? this.getInitialsAvatarUrl()
		);
	};

	getSenderDisplayName = () => {
		return this.getContent().displayname;
	};
}