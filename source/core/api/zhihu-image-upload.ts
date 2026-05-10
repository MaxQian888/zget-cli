// Mirrors Zhihu's snake_case API contract. See zhihu-api.ts for the same
// rationale.
/* eslint-disable @typescript-eslint/naming-convention, no-await-in-loop */
import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
import type {Buffer} from 'node:buffer';
import {CliError, ExitCode} from '../utils/exit-codes';
import type {ApiClient} from './client';
import type {ZhihuImageInfo} from './types';
import {readImageDimensions} from './image-dimensions';
import {
	buildAuthorizationHeader,
	canonicalizeOssHeaders,
	signOssRequest,
} from './oss-signer';

const zhihuApiV4 = 'https://www.zhihu.com/api/v4';

type RegisterResponse = {
	state: number; // 1 = already exists, 2 = upload required
	upload_token?: {
		access_id: string;
		access_key: string;
		access_secret: string;
		access_token?: string;
		security_token?: string;
		bucket?: string;
		endpoint?: string;
	};
	upload_file?: {
		object_key?: string;
		state: number;
	};
	object_key?: string;
	image_id?: string;
};

const mimeByExtension: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
};

function inferContentType(filename: string): string {
	const dotIndex = filename.lastIndexOf('.');
	const ext = dotIndex === -1 ? '' : filename.slice(dotIndex).toLowerCase();
	return mimeByExtension[ext] ?? 'application/octet-stream';
}

export type UploadOptions = {
	source?: 'article' | 'pin' | 'answer' | 'comment';
	pollIntervalMs?: number;
	pollMaxAttempts?: number;
};

// Three-stage Zhihu image upload:
//   1. POST /api/v4/upload_image — register MD5; receive object_key + OSS creds.
//   2. (state=2 only) PUT to OSS — sign with HMAC-SHA1 against the upload key.
//   3. GET /api/v4/images/{image_id}/status — poll until processing succeeds.
export async function uploadZhihuImage(
	client: ApiClient,
	filePath: string,
	options: UploadOptions = {},
): Promise<ZhihuImageInfo> {
	const buffer = await readFile(filePath);
	const filename = basename(filePath);
	const md5 = createHash('md5').update(buffer).digest('hex');
	const dimensions = readImageDimensions(buffer);
	const contentType = inferContentType(filename);

	// Stage 1: register
	const register = await client.postJson<RegisterResponse>(
		`${zhihuApiV4}/upload_image`,
		{
			image_hash: md5,
			source: options.source ?? 'article',
		},
	);

	const objectKey = register.object_key ?? register.upload_file?.object_key;
	const imageId = register.image_id ?? '';
	if (!objectKey || !imageId) {
		throw new CliError(
			'图片注册失败：响应缺少 object_key/image_id',
			ExitCode.PROTOCOL,
		);
	}

	// Stage 2: upload to OSS if required
	if (register.state === 2 && register.upload_token) {
		await uploadToOss(client, {
			uploadToken: register.upload_token,
			objectKey,
			buffer,
			contentType,
		});
	}

	// Stage 3: poll status
	const finalImageId = await pollImageStatus(
		client,
		imageId,
		options.pollIntervalMs ?? 1000,
		options.pollMaxAttempts ?? 10,
	);

	const src = `https://pic1.zhimg.com/${finalImageId}_r.jpg`;
	const originalSrc = `https://pic1.zhimg.com/${finalImageId}_r.jpg`;

	return {
		imageId: finalImageId,
		src,
		originalSrc,
		width: dimensions.width,
		height: dimensions.height,
	};
}

type OssUploadInput = {
	uploadToken: NonNullable<RegisterResponse['upload_token']>;
	objectKey: string;
	buffer: Buffer;
	contentType: string;
};

async function uploadToOss(
	client: ApiClient,
	input: OssUploadInput,
): Promise<void> {
	const {uploadToken, objectKey, buffer, contentType} = input;
	const endpoint = uploadToken.endpoint ?? 'zhihu-pics-upload.zhimg.com';
	const bucket = uploadToken.bucket ?? 'zhihu-pics';
	const securityToken =
		uploadToken.security_token ?? uploadToken.access_token ?? '';
	const ossHeaders: Record<string, string> = {
		'x-oss-security-token': securityToken,
	};
	const date = new Date().toUTCString();
	const canonicalizedResource = `/${bucket}/${objectKey}`;
	const signature = signOssRequest(
		{
			method: 'PUT',
			contentType,
			date,
			canonicalizedOssHeaders: canonicalizeOssHeaders(ossHeaders),
			canonicalizedResource,
		},
		uploadToken.access_secret,
	);

	const url = endpoint.startsWith('http')
		? `${endpoint}/${objectKey}`
		: `https://${endpoint}/${objectKey}`;

	await client.putBuffer(url, buffer, {
		Authorization: buildAuthorizationHeader(uploadToken.access_id, signature),
		'Content-Type': contentType,
		Date: date,
		'x-oss-security-token': securityToken,
	});
}

async function pollImageStatus(
	client: ApiClient,
	imageId: string,
	intervalMs: number,
	maxAttempts: number,
): Promise<string> {
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			const data = await client.getJson<{status: string; id?: string}>(
				`${zhihuApiV4}/images/${imageId}/status`,
			);
			if (data.status === 'success') {
				return data.id ?? imageId;
			}
		} catch {
			// Ignore transient errors; continue polling.
		}

		await new Promise(resolve => {
			setTimeout(resolve, intervalMs);
		});
	}

	// Best-effort: return the original imageId even if polling never confirmed,
	// so callers can still attempt to render the hybrid HTML. The publish
	// endpoint will reject if the image really isn't available.
	return imageId;
}
