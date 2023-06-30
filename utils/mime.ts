// https://github.com/cinnyapp/cinny/blob/dev/src/util/mimetypes.js

export const ALLOWED_BLOB_MIMETYPES = [
	"image/jpeg",
	"image/gif",
	"image/png",
	"image/apng",
	"image/webp",
	"image/avif",

	"video/mp4",
	"video/webm",
	"video/ogg",
	"video/quicktime",

	"audio/mp4",
	"audio/webm",
	"audio/aac",
	"audio/mpeg",
	"audio/ogg",
	"audio/wave",
	"audio/wav",
	"audio/x-wav",
	"audio/x-pn-wav",
	"audio/flac",
	"audio/x-flac",
];

export function getBlobSafeMimeType(mimetype: string) {
	if (typeof mimetype !== "string") return "application/octet-stream";
	const [type] = mimetype.split(";");
	if (!ALLOWED_BLOB_MIMETYPES.includes(type)) {
		return "application/octet-stream";
	}
	// Required for Chromium browsers
	if (type === "video/quicktime") {
		return "video/mp4";
	}
	return type;
}
