import {
	Direction,
	EventTimeline,
	EventTimelineSet,
	MatrixClient,
	MatrixEvent,
	Room,
} from "matrix-js-sdk";
import { MatrixMessage } from "./Event";
export class MatrixRoom {
	room: Room;
	private client: MatrixClient;
	id: string;
	timeline: EventTimeline;
	timelineSet: EventTimelineSet;

	constructor(roomId: string, client: MatrixClient) {
		const room = client.getRoom(roomId);
		if (!room) throw new Error("Invalid Room");
		this.room = room;
		this.client = client;
		this.id = room.roomId;
		this.timelineSet = this.room.getUnfilteredTimelineSet();
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

	public getSpaceChildren() {
		// If the room is a space, get all its room children
		if (this.room.isSpaceRoom()) {
			const events =
				this.room
					.getLiveTimeline()
					.getState(EventTimeline.FORWARDS)
					?.getStateEvents("m.space.child") ?? [];
			return events.map(e => e.getStateKey());
		}
	}

	/**
	 * Returns true if the room is not in any space
	 */
	public isOrphan() {
		return (
			this.room
				.getLiveTimeline()
				.getState(EventTimeline.FORWARDS)
				?.getStateEvents("m.space.parent").length === 0
		);
	}

	/**
	 * Find out whether the room is a DM or not
	 * @returns The other member of the DM, or null if not a DM
	 */
	public isDirectMessage() {
		return (
			(this.room.getMembers().length <= 2 &&
				this.room
					.getMembers()
					.find(m => m.userId !== this.client?.getUserId())) ||
			null
		);
	}

	public getLastTextMessage() {
		const events = [
			...this.timeline.getEvents().toReversed(),
			...(
				this.timeline
					.getNeighbouringTimeline(Direction.Backward)
					?.getEvents() ?? []
			).toReversed(),
		];

		const event =
			events.find(e => e.getContent().msgtype === "m.text") ?? null;
		return (event && new MatrixMessage(event, this.client)) || null;
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

	public getAvatarUrl(size = 96): string | null {
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
