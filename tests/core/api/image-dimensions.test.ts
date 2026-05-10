import {Buffer} from 'node:buffer';
import {describe, expect, it} from 'vitest';
import {readImageDimensions} from '../../../source/core/api/image-dimensions';

function makePngHeader(width: number, height: number): Buffer {
	const buffer = Buffer.alloc(33);
	// 8-byte PNG signature
	buffer[0] = 0x89;
	buffer[1] = 0x50;
	buffer[2] = 0x4e;
	buffer[3] = 0x47;
	buffer[4] = 0x0d;
	buffer[5] = 0x0a;
	buffer[6] = 0x1a;
	buffer[7] = 0x0a;
	// IHDR chunk length
	buffer.writeUInt32BE(13, 8);
	buffer.write('IHDR', 12, 4, 'ascii');
	buffer.writeUInt32BE(width, 16);
	buffer.writeUInt32BE(height, 20);
	return buffer;
}

function makeGifHeader(width: number, height: number): Buffer {
	const buffer = Buffer.alloc(13);
	buffer.write('GIF89a', 0, 6, 'ascii');
	buffer.writeUInt16LE(width, 6);
	buffer.writeUInt16LE(height, 8);
	return buffer;
}

describe('readImageDimensions', () => {
	it('reads PNG dimensions from IHDR', () => {
		const result = readImageDimensions(makePngHeader(800, 600));
		expect(result).toEqual({width: 800, height: 600, format: 'png'});
	});

	it('reads GIF dimensions from logical screen descriptor', () => {
		const result = readImageDimensions(makeGifHeader(120, 90));
		expect(result).toEqual({width: 120, height: 90, format: 'gif'});
	});

	it('throws on unknown formats', () => {
		expect(() => readImageDimensions(Buffer.from('not an image'))).toThrowError(
			/不支持的图片格式/,
		);
	});
});
