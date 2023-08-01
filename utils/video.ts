export function loadVideo(videoFile: File): Promise<HTMLVideoElement> {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.preload = "metadata";
		video.playsInline = true;
		video.muted = true;

		const reader = new FileReader();

		reader.onload = ev => {
			// Wait until we have enough data to thumbnail the first frame.
			video.onloadeddata = () => {
				resolve(video);
				video.pause();
			};
			video.onerror = e => {
				reject(e);
			};

			video.src = (ev.target as any).result;
			video.load();
			video.play();
		};
		reader.onerror = e => {
			reject(e);
		};
		if (videoFile.type === "video/quicktime") {
			const quicktimeVideoFile = new File([videoFile], videoFile.name, {
				type: "video/mp4",
			});
			reader.readAsDataURL(quicktimeVideoFile);
		} else {
			reader.readAsDataURL(videoFile);
		}
	});
}
export function getVideoThumbnail(
	video: HTMLVideoElement,
	width: number,
	height: number,
	mimeType: string
): Promise<{
	thumbnail: Blob | null;
	info: {
		w: number;
		h: number;
		mimetype?: string;
		size?: number;
	};
}> {
	return new Promise(resolve => {
		const MAX_WIDTH = 800;
		const MAX_HEIGHT = 600;
		let targetWidth = width;
		let targetHeight = height;
		if (targetHeight > MAX_HEIGHT) {
			targetWidth = Math.floor(targetWidth * (MAX_HEIGHT / targetHeight));
			targetHeight = MAX_HEIGHT;
		}
		if (targetWidth > MAX_WIDTH) {
			targetHeight = Math.floor(targetHeight * (MAX_WIDTH / targetWidth));
			targetWidth = MAX_WIDTH;
		}

		const canvas = document.createElement("canvas");
		canvas.width = targetWidth;
		canvas.height = targetHeight;
		const context = canvas.getContext("2d")!;
		context.drawImage(video, 0, 0, targetWidth, targetHeight);

		canvas.toBlob(thumbnail => {
			resolve({
				thumbnail,
				info: {
					w: targetWidth,
					h: targetHeight,
					mimetype: thumbnail?.type,
					size: thumbnail?.size,
				},
			});
		}, mimeType);
	});
}
