import { MatrixClient, MatrixEvent, User } from "matrix-js-sdk";

export class MatrixUser {
	private user: User;
	private client: MatrixClient;
	id: string;

	constructor(userId: string, client: MatrixClient) {
		const user = client.getUser(userId);

		if (!user) throw Error("Invalid Room");

		this.user = user;
		this.client = client;
		this.id = user.userId;
	}

	public getDisplayName(): string | null {
		return this.user.displayName ?? null;
	}

	public getMxcAvatarUrl(): string | null {
		return this.user.avatarUrl ?? null;
	}

	public getAvatarUrl(size: number = 96): string | null {
		return this.client.mxcUrlToHttp(
			this.getMxcAvatarUrl() ?? "",
			size,
			size,
			"scale",
			false
		);
	}
}
