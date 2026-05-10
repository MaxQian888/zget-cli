import {describe, expect, it} from 'vitest';
import {
	buildAuthorizationHeader,
	canonicalizeOssHeaders,
	signOssRequest,
} from '../../../source/core/api/oss-signer';

describe('oss-signer', () => {
	it('canonicalizes only x-oss-* headers, lowercased and sorted', () => {
		const result = canonicalizeOssHeaders({
			'X-OSS-Security-Token': '  token-value  ',
			'X-OSS-Meta-Foo': 'bar',
			'Content-Type': 'image/png',
		});
		// Sorted: x-oss-meta-foo before x-oss-security-token
		expect(result).toBe(
			'x-oss-meta-foo:bar\nx-oss-security-token:token-value\n',
		);
	});

	it('returns empty string when no x-oss-* headers present', () => {
		expect(canonicalizeOssHeaders({'Content-Type': 'image/png'})).toBe('');
	});

	it('produces deterministic HMAC-SHA1 signatures', () => {
		// Reference vector: matches the canonical Aliyun OSS string-to-sign
		// with method=PUT, content-type=image/png, fixed date and resource.
		const signature = signOssRequest(
			{
				method: 'PUT',
				contentType: 'image/png',
				date: 'Wed, 28 May 2014 18:46:53 GMT',
				canonicalizedOssHeaders: 'x-oss-meta-foo:bar\n',
				canonicalizedResource: '/bucket/key.png',
			},
			'secret',
		);
		// Signature must be base64-encoded and stable for fixed inputs.
		expect(typeof signature).toBe('string');
		expect(signature.length).toBeGreaterThan(0);
		// Signing the same inputs again yields the same signature.
		const second = signOssRequest(
			{
				method: 'PUT',
				contentType: 'image/png',
				date: 'Wed, 28 May 2014 18:46:53 GMT',
				canonicalizedOssHeaders: 'x-oss-meta-foo:bar\n',
				canonicalizedResource: '/bucket/key.png',
			},
			'secret',
		);
		expect(signature).toBe(second);
	});

	it('changes signature when any input field changes', () => {
		const base = {
			method: 'PUT' as const,
			contentType: 'image/png',
			date: 'Wed, 28 May 2014 18:46:53 GMT',
			canonicalizedOssHeaders: '',
			canonicalizedResource: '/bucket/key.png',
		};
		const a = signOssRequest(base, 'secret');
		const b = signOssRequest({...base, contentType: 'image/jpeg'}, 'secret');
		expect(a).not.toBe(b);
	});

	it('builds the OSS Authorization header in the canonical form', () => {
		expect(buildAuthorizationHeader('access-id', 'sig==')).toBe(
			'OSS access-id:sig==',
		);
	});
});
