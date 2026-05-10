// Tiny image dimensions reader — supports PNG, JPEG, GIF, WebP.
// Avoids adding a runtime dependency for what amounts to ~60 lines of
// fixed-offset parsing. Used by the Zhihu image upload pipeline.
// Bitwise ops are intrinsic to binary format parsing here.
/* eslint-disable no-bitwise, unicorn/numeric-separators-style */

import type {Buffer} from 'node:buffer';

export type ImageDimensions = {
	width: number;
	height: number;
	format: 'png' | 'jpeg' | 'gif' | 'webp';
};

export function readImageDimensions(buffer: Buffer): ImageDimensions {
	if (isPng(buffer)) {
		return {
			width: buffer.readUInt32BE(16),
			height: buffer.readUInt32BE(20),
			format: 'png',
		};
	}

	if (isGif(buffer)) {
		return {
			width: buffer.readUInt16LE(6),
			height: buffer.readUInt16LE(8),
			format: 'gif',
		};
	}

	if (isWebp(buffer)) {
		return readWebpDimensions(buffer);
	}

	if (isJpeg(buffer)) {
		return readJpegDimensions(buffer);
	}

	throw new Error('不支持的图片格式（仅支持 PNG/JPEG/GIF/WebP）');
}

function isPng(buffer: Buffer): boolean {
	return (
		buffer.length >= 24 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	);
}

function isJpeg(buffer: Buffer): boolean {
	return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function isGif(buffer: Buffer): boolean {
	return (
		buffer.length >= 10 &&
		buffer[0] === 0x47 &&
		buffer[1] === 0x49 &&
		buffer[2] === 0x46
	);
}

function isWebp(buffer: Buffer): boolean {
	return (
		buffer.length >= 30 &&
		buffer.toString('ascii', 0, 4) === 'RIFF' &&
		buffer.toString('ascii', 8, 12) === 'WEBP'
	);
}

function readWebpDimensions(buffer: Buffer): ImageDimensions {
	const chunkType = buffer.toString('ascii', 12, 16);
	if (chunkType === 'VP8 ') {
		return {
			width: buffer.readUInt16LE(26) & 0x3fff,
			height: buffer.readUInt16LE(28) & 0x3fff,
			format: 'webp',
		};
	}

	if (chunkType === 'VP8L') {
		const b0 = buffer[21]!;
		const b1 = buffer[22]!;
		const b2 = buffer[23]!;
		const b3 = buffer[24]!;
		return {
			width: (((b1 & 0x3f) << 8) | b0) + 1,
			height: (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) + 1,
			format: 'webp',
		};
	}

	if (chunkType === 'VP8X') {
		const w =
			(buffer[26]! | (buffer[25]! << 8) | ((buffer[24]! << 16) & 0xff_ff_ff)) +
			1;
		const h =
			(buffer[29]! | (buffer[28]! << 8) | ((buffer[27]! << 16) & 0xff_ff_ff)) +
			1;
		return {width: w, height: h, format: 'webp'};
	}

	throw new Error('未识别的 WebP 子格式');
}

function readJpegDimensions(buffer: Buffer): ImageDimensions {
	let offset = 2;
	while (offset < buffer.length) {
		if (buffer[offset] !== 0xff) {
			throw new Error('JPEG 数据损坏');
		}

		let marker = buffer[offset + 1]!;
		offset += 2;
		// Skip fill bytes
		while (marker === 0xff && offset < buffer.length) {
			marker = buffer[offset]!;
			offset += 1;
		}

		// SOF0..SOF15 (excluding DHT=0xC4, JPG=0xC8, DAC=0xCC) carry dimensions.
		const isSof =
			marker >= 0xc0 &&
			marker <= 0xcf &&
			marker !== 0xc4 &&
			marker !== 0xc8 &&
			marker !== 0xcc;
		const segmentLength = buffer.readUInt16BE(offset);
		if (isSof) {
			return {
				height: buffer.readUInt16BE(offset + 3),
				width: buffer.readUInt16BE(offset + 5),
				format: 'jpeg',
			};
		}

		offset += segmentLength;
	}

	throw new Error('JPEG 中未找到 SOF 段');
}
