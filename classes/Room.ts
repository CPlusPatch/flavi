import {
	Direction,
	EventTimeline,
	EventTimelineSet,
	MatrixClient,
	MatrixEvent,
	Room,
} from "matrix-js-sdk";
export class MatrixRoom {
	room: Room;
	private client: MatrixClient;
	id: string;
	timeline: EventTimeline;
	timelineSet: EventTimelineSet;

	constructor(roomId: string, client: MatrixClient) {
		const room = client.getRoom(roomId);
		if (!room) throw Error("Invalid Room");
		this.room = room;
		this.client = client;
		this.id = room.roomId;
		this.timelineSet = this.room.getUnfilteredTimelineSet()
		this.timeline = this.timelineSet.getLiveTimeline();
	}

	private sortEvents(events: MatrixEvent[]) {
		return events.toSorted(
			(a, b) =>
				(b.getDate()?.getTime() ?? 0) - (a.getDate()?.getTime() ?? 0)
		);
	}

	public getLastEvents(): MatrixEvent[] {
		return this.sortEvents(this.timeline.getEvents());
	}

	public refreshTimeline() {
		this.timelineSet = this.room.getUnfilteredTimelineSet();
		this.timeline = this.timelineSet.getLiveTimeline();
	}

	public getLastTextMessage(): MatrixEvent | null {
		let events = [
			...this.timeline.getEvents().toReversed(),
			...(
				this.timeline
					.getNeighbouringTimeline(Direction.Backward)
					?.getEvents() ?? []
			).toReversed(),
		];
		return events.find(e => e.getContent().msgtype === "m.text") ?? null;
	}

	public getName(): string {
		return this.room.name;
	}

	public isSpace(): boolean {
		return this.room.isSpaceRoom();
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

	public getTopic() {
		return (
			this.room.currentState
				.getStateEvents("m.room.topic")[0]
				?.getContent().topic ?? ""
		);
	}
}
