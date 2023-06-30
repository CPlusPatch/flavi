import { encode } from "blurhash";

export function encodeBlurhash(img: any) {
	const canvas = document.createElement("canvas");
	canvas.width = 100;
	canvas.height = 100;
	const context = canvas.getContext("2d")!;
	context.drawImage(img, 0, 0, canvas.width, canvas.height);
	const data = context.getImageData(0, 0, canvas.width, canvas.height);
	return encode(data.data, data.width, data.height, 4, 4);
}
