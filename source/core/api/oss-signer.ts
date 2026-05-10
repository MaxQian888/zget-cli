import {createHmac} from 'node:crypto';

export type OssSignParameters = {
	method: 'PUT' | 'POST' | 'GET' | 'DELETE' | 'HEAD';
	contentMd5?: string;
	contentType?: string;
	date: string;
	canonicalizedOssHeaders: string;
	canonicalizedResource: string;
};

// Aliyun OSS signature v1 (HMAC-SHA1).
// String-to-sign = VERB + "\n" + Content-MD5 + "\n" + Content-Type + "\n"
//                 + Date + "\n" + CanonicalizedOSSHeaders + CanonicalizedResource
export function signOssRequest(
	parameters: OssSignParameters,
	accessKeySecret: string,
): string {
	const stringToSign = [
		parameters.method,
		parameters.contentMd5 ?? '',
		parameters.contentType ?? '',
		parameters.date,
		parameters.canonicalizedOssHeaders + parameters.canonicalizedResource,
	].join('\n');

	return createHmac('sha1', accessKeySecret)
		.update(stringToSign, 'utf8')
		.digest('base64');
}

export function buildAuthorizationHeader(
	accessKeyId: string,
	signature: string,
): string {
	return `OSS ${accessKeyId}:${signature}`;
}

// Canonicalize x-oss-* headers per Aliyun spec: lowercase keys, sorted, joined
// by '\n', each line "key:value", trailing '\n' if any present.
export function canonicalizeOssHeaders(
	headers: Record<string, string>,
): string {
	const ossHeaders = Object.entries(headers)
		.map(([key, value]) => [key.toLowerCase(), value.trim()] as const)
		.filter(([key]) => key.startsWith('x-oss-'))
		.sort(([a], [b]) => a.localeCompare(b));

	if (ossHeaders.length === 0) return '';
	return ossHeaders.map(([key, value]) => `${key}:${value}`).join('\n') + '\n';
}
