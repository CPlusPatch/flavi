import { encryptAttachment } from "matrix-encrypt-attachment";
import { MatrixClient, UploadProgress } from "matrix-js-sdk";
import { encodeBlurhash } from "~/utils/blurhash";
import { getVideoThumbnail, loadVideo } from "~/utils/video";

export const setFileMetadata = async (
	content: any,
	file: File,
	fileType: string,
	isEncryptedRoom: boolean,
	client: MatrixClient
) => {
	switch (fileType) {
		case "image": {
			const img: HTMLImageElement = await new Promise(
				(resolve, reject) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.onerror = err => reject(err);
					img.src = URL.createObjectURL(file);
				}
			);

			content.info.w = img.width;
			content.info.h = img.height;
			content.info["xyz.amorgan.blurhash"] = encodeBlurhash(img);

			content.msgtype = "m.image";
			content.body = file.name || "Image";

			break;
		}

		case "video": {
			const video = await loadVideo(file);

			content.info.w = video.videoWidth;
			content.info.h = video.videoHeight;
			content.info["xyz.amorgan.blurhash"] = encodeBlurhash(video);

			const thumbnailData = await getVideoThumbnail(
				video,
				video.videoWidth,
				video.videoHeight,
				"image/webp"
			);
			const thumbnailUploadData = await uploadFile(
				thumbnailData.thumbnail!,
				() => {},
				isEncryptedRoom,
				client
			);

			content.info.thumbnail_info = thumbnailData.info;

			if (isEncryptedRoom) {
				content.info.thumbnail_file = thumbnailUploadData.file;
			} else {
				content.info.thumbnail_url = thumbnailUploadData.url;
			}

			content.msgtype = "m.video";
			content.body = file.name || "Video";

			break;
		}

		case "audio": {
			content.msgtype = "m.audio";
			content.body = file.name || "Audio";

			break;
		}

		default: {
			content.msgtype = "m.file";
			content.body = file.name || "File";
		}
	}

	return content;
};

export const uploadFile = async (
	file: File | Blob,
	progressHandler: (progress: UploadProgress) => void,
	isEncryptedRoom: boolean,
	client: MatrixClient
) => {
	let encryptInfo: any = {};
	let encryptBlob: any = {};

	if (isEncryptedRoom) {
		const buffer = await file.arrayBuffer();
		const encryptedResult = await encryptAttachment(buffer);

		encryptInfo = encryptedResult.info;
		encryptBlob = new Blob([encryptedResult.data]);
	}

	const response = await client.uploadContent(
		isEncryptedRoom ? encryptBlob! : file,
		{
			progressHandler,
		}
	);

	if (isEncryptedRoom) {
		encryptInfo.url = response?.content_uri;
		if (file.type) encryptInfo.mimetype = file.type;
		return { file: encryptInfo };
	} else {
		return { url: response?.content_uri };
	}
};
