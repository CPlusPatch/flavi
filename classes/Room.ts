import { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";

export class MatrixRoom {
	private room: Room;
	private client: MatrixClient;
	id: string;

	constructor(roomId: string, client: MatrixClient) {
		const room = client.getRoom(roomId);

		if (!room) throw Error("Invalid Room");

		this.room = room;
		this.client = client;
		this.id = room.roomId;
	}

	public getMessages(): MatrixEvent[] {
		return this.room.getLiveTimeline().getEvents();
	}

	public getName(): string {
		return this.room.name;
	}

	public getAvatarUrl(size: number = 96): string | null {
		const url =
			this.room?.getAvatarUrl(
				this.client?.baseUrl ?? "",
				size,
				size,
				"scale"
			) ??
			this.room
				?.getAvatarFallbackMember()
				?.getAvatarUrl(
					this.client?.baseUrl ?? "",
					size,
					size,
					"scale",
					true,
					true
				);
		
		return url ?? null;
	}
	public async getMember(userId: string) {
		
	}
	public getTopic() {
		
	}
}
