import { DeviceMap, MatrixClient, User } from "matrix-js-sdk";

export class MatrixUser {
	private user: User;
	private client: MatrixClient;
	id: string;

	constructor(userId: string, client: MatrixClient) {
		const user = client.getUser(userId);

		if (!user) throw new Error("Invalid user");

		this.user = user;
		this.client = client;
		this.id = user.userId;
	}

	public getStatus() {
		return this.user.presenceStatusMsg;
	}

	public async getDevices() {
		return (
			(await this.client.getCrypto()?.getUserDeviceInfo([this.id])) ??
			(new Map() as DeviceMap)
		);
	}

	public getDisplayName(): string | null {
		return this.user.displayName ?? null;
	}

	public getMxcAvatarUrl(): string | null {
		return this.user.avatarUrl ?? null;
	}

	public getPresenceStatus() {
		return this.user.presence;
	}

	/**
	 * Calculate color based on display name hash
	 * @returns UnoCSS color class
	 */
	public async getUserColor(): Promise<string> {
		const nameHash = await crypto.subtle.digest(
			"sha-1",
			new TextEncoder().encode(this.getDisplayName() ?? this.user.userId)
		);

		const hashArray = Array.from(new Uint8Array(nameHash)); // convert buffer to byte array
		const hashHex = hashArray
			.map(b => b.toString(9).padStart(2, "0"))
			.join(""); // convert bytes to hex string

		switch (hashHex[0]) {
			case "1":
				return "text-green-400";
			case "2":
				return "text-yellow-400";
			case "3":
				return "text-blue-400";
			case "4":
				return "text-orange-400";
			case "5":
				return "text-purple-400";
			case "6":
				return "text-red-400";
			case "7":
				return "text-gray-400";
			case "8":
				return "text-pink-400";
			default:
				return "text-green-400";
		}
	}

	public getAvatarUrl(size = 96) {
		return (
			this.client.mxcUrlToHttp(
				this.getMxcAvatarUrl() ?? "",
				size,
				size,
				"scale",
				false
			) ||
			`https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(
				this.getDisplayName() ?? ""
			)}&fontWeight=900&chars=1`
		);
	}
}
