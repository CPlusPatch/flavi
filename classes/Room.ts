import { EventTimeline, MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";

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

	public getTimeline() {
		return this.room.getLiveTimeline();
	}

	public getPreviousTimeline(timeline: EventTimeline) {
		return timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);
	}

	public getLastTextMessage(): MatrixEvent | null {
		let timeline: EventTimeline | null = this.room.getLiveTimeline();
		let events = timeline.getEvents();

		for (let i = 0; i < 20; i++) {
			const event = events.at(-i);

			if (event && event.getContent().msgtype == "m.text") {
				return event;
			} else {
				timeline = timeline?.getNeighbouringTimeline(EventTimeline.BACKWARDS) ?? null;
				events = [
					...(timeline?.getEvents() ?? []),
					...events,
				]
			}
		}


		return null
	}

	public getName(): string {
		return this.room.name;
	}

	public isSpace(): boolean {
		return this.room.isSpaceRoom()
	}

	public getLastMessageDate(): Date {
		return new Date(this.room.getLastActiveTimestamp());
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
