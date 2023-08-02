/**
 * Adapted from https://github.com/cinnyapp/cinny/blob/f14d70ea3508a8467c0a27b9d61c8ab6661054ab/src/client/state/RoomTimeline.js
 * License: AGPL-3.0
 * Thanks, Cinny <3
 */

import EventEmitter from "events";
import {
	Direction,
	EventTimeline,
	EventTimelineSet,
	IRoomTimelineData,
	MatrixClient,
	MatrixEvent,
	MatrixEventEvent,
	Room,
	RoomEvent,
	RoomMember,
	RoomMemberEvent,
} from "matrix-js-sdk";
import { MatrixRoom } from "./Room";
import events from "~/utils/events";

type Optional<T> = T | null | undefined;

function isEdited(event: MatrixEvent) {
	return event.getRelation()?.rel_type === "m.replace";
}

function isReaction(event: MatrixEvent) {
	return event.getType() === "m.reaction";
}

function hideMemberEvents(_event: MatrixEvent) {
	// const content = event.getContent();
	// const prevContent = event.getPrevContent();
	// const { membership } = content;
	return false;
}

function getRelateToId(event: MatrixEvent) {
	const relation = event.getRelation();
	return relation && relation.event_id;
}

function addToMap(myMap: Map<string, MatrixEvent[]>, event: MatrixEvent) {
	const relateToId = getRelateToId(event) ?? "";
	if (relateToId === "") return null;
	const mEventId = event.getId();

	if (typeof myMap.get(relateToId) === "undefined") myMap.set(relateToId, []);
	const mEvents = myMap.get(relateToId)!;
	if (mEvents.find(ev => ev.getId() === mEventId)) return event;
	mEvents.push(event);
	return event;
}

function getFirstLinkedTimeline(timeline: Optional<EventTimeline>) {
	let tm = timeline;
	while (tm?.getNeighbouringTimeline(Direction.Backward)) {
		tm = tm.getNeighbouringTimeline(Direction.Backward);
	}
	return tm;
}
function getLastLinkedTimeline(timeline: Optional<EventTimeline>) {
	let tm = timeline;
	while (tm?.getNeighbouringTimeline(Direction.Forward)) {
		tm = tm.getNeighbouringTimeline(Direction.Forward);
	}
	return tm;
}

function iterateLinkedTimelines(
	timeline: Optional<EventTimeline>,
	backwards: boolean,
	callback: (tm: EventTimeline) => void
) {
	let tm = timeline;
	while (tm) {
		callback(tm);
		if (backwards) tm = tm.getNeighbouringTimeline(Direction.Backward);
		else tm = tm.getNeighbouringTimeline(Direction.Forward);
	}
}

function isTimelineLinked(
	tm1: Optional<EventTimeline>,
	tm2: Optional<EventTimeline>
) {
	let tm = getFirstLinkedTimeline(tm1);
	while (tm) {
		if (tm === tm2) return true;
		tm = tm.getNeighbouringTimeline(Direction.Forward);
	}
	return false;
}

export class RoomTimeline extends EventEmitter {
	timeline: MatrixEvent[];
	editedTimeline: Map<string, MatrixEvent[]>;
	reactionTimeline: Map<string, MatrixEvent[]>;
	private client: MatrixClient;
	room: MatrixRoom;
	liveTimeline: EventTimeline;
	activeTimeline?: Optional<EventTimeline>;
	typingMembers: Set<string>;

	isOngoingPagination: boolean;
	ongoingDecryptionCount: number;
	initialized: boolean;

	constructor(roomId: string, client: MatrixClient) {
		super();
		// These are local timelines
		this.timeline = [];
		this.editedTimeline = new Map();
		this.reactionTimeline = new Map();
		this.typingMembers = new Set();

		this.client = client;
		this.room = new MatrixRoom(roomId, this.client);

		this.liveTimeline = this.room.room.getLiveTimeline();
		this.activeTimeline = this.liveTimeline;

		this.isOngoingPagination = false;
		this.ongoingDecryptionCount = 0;
		this.initialized = false;
	}

	isServingLiveTimeline() {
		return (
			getLastLinkedTimeline(this.activeTimeline!) === this.liveTimeline
		);
	}

	canPaginateBackward() {
		if (this.timeline[0]?.getType() === "m.room.create") return false;
		const tm = getFirstLinkedTimeline(this.activeTimeline!);
		return tm?.getPaginationToken(Direction.Backward) !== null;
	}

	canPaginateForward() {
		return !this.isServingLiveTimeline();
	}

	isEncrypted() {
		return this.client.isRoomEncrypted(this.room.id);
	}

	clearLocalTimelines() {
		this.timeline = [];
	}

	addToTimeline(event: MatrixEvent) {
		if (event.getType() === "m.room.member" && hideMemberEvents(event)) {
			return;
		}
		if (event.isRedacted()) return;
		if (isReaction(event)) {
			addToMap(this.reactionTimeline, event);
			return;
		}
		if (isEdited(event)) {
			addToMap(this.editedTimeline, event);
			return;
		}

		this.timeline.push(event);
	}

	_populateAllLinkedEvents(timeline: EventTimeline) {
		const firstTimeline = getFirstLinkedTimeline(timeline);
		iterateLinkedTimelines(firstTimeline!, false, tm => {
			tm.getEvents().forEach(event => this.addToTimeline(event));
		});
	}

	_populateTimelines() {
		this.clearLocalTimelines();
		this._populateAllLinkedEvents(this.activeTimeline!);
	}

	async _reset() {
		if (this.isEncrypted())
			await this.decryptAllEventsOfTimeline(this.activeTimeline!);
		this._populateTimelines();
		if (!this.initialized) {
			this.initialized = true;
			this._listenEvents();
		}
	}

	async loadLiveTimeline() {
		this.activeTimeline = this.liveTimeline;
		await this._reset();
		this.emit(events.events.timeline.READY, null);
		return true;
	}

	async loadEventTimeline(eventId: string) {
		// we use first unfiltered EventTimelineSet for room pagination.
		const timelineSet = this.getUnfilteredTimelineSet();
		try {
			const eventTimeline = await this.client.getEventTimeline(
				timelineSet,
				eventId
			);
			this.activeTimeline = eventTimeline;
			await this._reset();
			this.emit(events.events.timeline.READY, eventId);
			return true;
		} catch {
			return false;
		}
	}

	async paginateTimeline(backwards = false, limit = 30) {
		if (this.initialized === false) return false;
		if (this.isOngoingPagination) return false;

		this.isOngoingPagination = true;

		const timelineToPaginate = backwards
			? getFirstLinkedTimeline(this.activeTimeline)
			: getLastLinkedTimeline(this.activeTimeline);

		if (
			timelineToPaginate?.getPaginationToken(
				backwards ? Direction.Backward : Direction.Forward
			) === null
		) {
			this.emit(events.events.timeline.PAGINATED, backwards, 0);
			this.isOngoingPagination = false;
			return false;
		}

		const oldSize = this.timeline.length;
		try {
			await this.client.paginateEventTimeline(timelineToPaginate!, {
				backwards,
				limit,
			});

			if (this.isEncrypted())
				await this.decryptAllEventsOfTimeline(this.activeTimeline!);
			this._populateTimelines();

			const loaded = this.timeline.length - oldSize;
			this.emit(events.events.timeline.PAGINATED, backwards, loaded);
			this.isOngoingPagination = false;
			return true;
		} catch {
			this.emit(events.events.timeline.PAGINATED, backwards, 0);
			this.isOngoingPagination = false;
			return false;
		}
	}

	decryptAllEventsOfTimeline(eventTimeline: EventTimeline) {
		const decryptionPromises = eventTimeline
			.getEvents()
			.filter(event => event.isEncrypted() && !event.getClearContent())
			.reverse()
			.map(event =>
				event.attemptDecryption(this.client.crypto!, {
					isRetry: true,
				})
			);

		return Promise.allSettled(decryptionPromises);
	}

	hasEventInTimeline(
		eventId: string,
		timeline: Optional<EventTimeline> = this.activeTimeline
	) {
		const timelineSet = this.getUnfilteredTimelineSet();
		const eventTimeline = timelineSet.getTimelineForEvent(eventId);
		if (!eventTimeline) return false;
		return isTimelineLinked(eventTimeline, timeline);
	}

	getUnfilteredTimelineSet() {
		return this.room.room.getUnfilteredTimelineSet();
	}

	getEventReaders(event: MatrixEvent) {
		const liveEvents = this.liveTimeline.getEvents();
		const readers: string[] = [];
		if (!event) return [];

		for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
			readers.splice(
				readers.length,
				0,
				...this.room.room.getUsersReadUpTo(liveEvents[i])
			);
			if (event === liveEvents[i]) break;
		}

		return [...new Set(readers)];
	}

	getLiveReaders() {
		const liveEvents = this.liveTimeline.getEvents();
		const getLatestVisibleEvent = () => {
			for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
				const mEvent = liveEvents[i];
				if (
					mEvent.getType() === "m.room.member" &&
					hideMemberEvents(mEvent)
				) {
					continue;
				}
				if (
					!mEvent.isRedacted() &&
					!isReaction(mEvent) &&
					!isEdited(mEvent)
				)
					return mEvent;
			}
			return liveEvents[liveEvents.length - 1];
		};

		return this.getEventReaders(getLatestVisibleEvent());
	}

	getUnreadEventIndex(readUpToEventId: string) {
		if (!this.hasEventInTimeline(readUpToEventId)) return -1;

		const readUpToEvent = this.findEventByIdInTimelineSet(readUpToEventId);
		if (!readUpToEvent) return -1;
		const rTs = readUpToEvent.getTs();

		const tLength = this.timeline.length;

		for (let i = 0; i < tLength; i += 1) {
			const mEvent = this.timeline[i];
			if (mEvent.getTs() > rTs) return i;
		}
		return -1;
	}

	getReadUpToEventId() {
		return this.room.room.getEventReadUpTo(this.client.getUserId() ?? "");
	}

	getEventIndex(eventId: string) {
		return this.timeline.findIndex(mEvent => mEvent.getId() === eventId);
	}

	findEventByIdInTimelineSet(
		eventId: string,
		eventTimelineSet: EventTimelineSet = this.getUnfilteredTimelineSet()
	) {
		return eventTimelineSet.findEventById(eventId);
	}

	findEventById(eventId: string) {
		return this.timeline[this.getEventIndex(eventId)] ?? null;
	}

	deleteFromTimeline(eventId: string) {
		const i = this.getEventIndex(eventId);
		if (i === -1) return undefined;
		return this.timeline.splice(i, 1)[0];
	}

	_listenRoomTimeline: any;
	_listenDecryptEvent: any;
	_listenRedaction: any;
	_listenTypingEvent: any;
	_listenReceiptEvent: any;

	_listenEvents() {
		this._listenRoomTimeline = (
			event: MatrixEvent,
			room: Room | undefined,
			_toStartOfTimeline: boolean | undefined,
			_removed: boolean,
			data: IRoomTimelineData
		) => {
			if (room?.roomId !== this.room.id) return;
			if (this.isOngoingPagination) return;

			// User is currently viewing the old events probably
			// no need to add new event and emit changes.
			// only add reactions and edited messages
			if (this.isServingLiveTimeline() === false) {
				if (!isReaction(event) && !isEdited(event)) return;
			}

			// We only process live events here
			if (!data.liveEvent) return;

			if (event.isEncrypted()) {
				// We will add this event after it is being decrypted.
				this.ongoingDecryptionCount += 1;
				return;
			}

			// FIXME: An unencrypted plain event can come
			// while previous event is still decrypting
			// and has not been added to timeline
			// causing unordered timeline view.

			this.addToTimeline(event);
			this.emit(events.events.timeline.EVENT, event);
		};

		this._listenDecryptEvent = (event: MatrixEvent) => {
			if (event.getRoomId() !== this.room.id) return;
			if (this.isOngoingPagination) return;

			// Not a live event.
			// so we don't need to process it here
			if (this.ongoingDecryptionCount === 0) return;

			if (this.ongoingDecryptionCount > 0) {
				this.ongoingDecryptionCount -= 1;
			}

			console.error(event.getContent());
			this.addToTimeline(event);
			this.emit(events.events.timeline.EVENT, event);
		};

		this._listenRedaction = (event: MatrixEvent, room: Room) => {
			if (room.roomId !== this.room.id) return;
			// const rEvent = this.deleteFromTimeline(event.event.redacts ?? "");
			this.editedTimeline.delete(event.event.redacts ?? "");
			this.reactionTimeline.delete(event.event.redacts ?? "");
			this.emit(events.events.timeline.EVENT_REDACTED, event);
		};

		this._listenTypingEvent = (_event: MatrixEvent, member: RoomMember) => {
			if (member.roomId !== this.room.id) return;

			const isTyping = member.typing;
			if (isTyping) this.typingMembers.add(member.userId);
			else this.typingMembers.delete(member.userId);
			this.emit(
				events.events.timeline.TYPING_MEMBERS_UPDATED,
				new Set([...this.typingMembers])
			);
		};

		this._listenReceiptEvent = (event: MatrixEvent, room: Room) => {
			// we only process receipt for latest message here.
			if (room.roomId !== this.room.id) return;
			const receiptContent = event.getContent();

			const mEvents = this.liveTimeline.getEvents();
			const lastMEvent = mEvents[mEvents.length - 1];
			const lastEventId = lastMEvent.getId();
			const lastEventRecipt = receiptContent[lastEventId ?? ""];

			if (typeof lastEventRecipt === "undefined") return;
			if (lastEventRecipt["m.read"]) {
				this.emit(events.events.timeline.LIVE_RECEIPT);
			}
		};

		this.client.on(RoomEvent.Timeline, this._listenRoomTimeline);
		this.client.on(RoomEvent.Redaction, this._listenRedaction);
		this.client.on(MatrixEventEvent.Decrypted, this._listenDecryptEvent);
		this.client.on(RoomMemberEvent.Typing, this._listenTypingEvent);
		this.client.on(RoomEvent.Receipt, this._listenReceiptEvent);
	}

	removeInternalListeners() {
		if (!this.initialized) return;
		this.client.removeListener(
			RoomEvent.Timeline,
			this._listenRoomTimeline
		);
		this.client.removeListener(RoomEvent.Redaction, this._listenRedaction);
		this.client.removeListener(
			MatrixEventEvent.Decrypted,
			this._listenDecryptEvent
		);
		this.client.removeListener(
			RoomMemberEvent.Typing,
			this._listenTypingEvent
		);
		this.client.removeListener(RoomEvent.Receipt, this._listenReceiptEvent);
	}
}

export default RoomTimeline;
