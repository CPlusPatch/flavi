const TimelineEvents = {
	READY: "TimelineEvents.Ready",
	PAGINATED: "TimelineEvents.Paginated",
	EVENT_REDACTED: "TimelineEvents.EventRedacted",
	EVENT: "TimelineEvents.Event",
	TYPING_MEMBERS_UPDATED: "TimelineEvents.TypingMembersUpdated",
	LIVE_RECEIPT: "TimelineEvents.LiveReceipt",
};

export default {
	events: {
		timeline: TimelineEvents
	}
}