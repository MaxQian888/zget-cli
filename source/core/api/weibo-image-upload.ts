import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import type {WeiboCookieStore} from '../auth/weibo-auth';
import {CliError, ExitCode} from '../utils/exit-codes';
import {getWeiboHeaders} from '../utils/headers';

const PIC_UPLOAD_BASE = 'https://picupload.weibo.com/interface/pic_upload.php';

const MIME_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
};

function inferMime(filePath: string): string {
	const ext = extname(filePath).toLowerCase();
	return MIME_BY_EXT[ext] ?? 'image/jpeg';
}

/**
 * Uploads a single image to Weibo's pic upload endpoint and returns
 * the resulting pic_id (used by /ajax/statuses/update).
 *
 * Endpoint accepts the raw image bytes as the request body and
 * returns an XML payload with <pic_id>...</pic_id>.
 */
export async function uploadWeiboImage(
	filePath: string,
	store: WeiboCookieStore,
): Promise<string> {
	if (!store.isAuthenticated()) {
		throw new CliError(
			'未登录，请先运行 "zget weibo login"',
			ExitCode.NOPERM,
			'运行 zget weibo login',
		);
	}

	const buffer = await readFile(filePath);
	const mime = inferMime(filePath);

	const url = new URL(PIC_UPLOAD_BASE);
	url.searchParams.set('cb', 'https://weibo.com/aj/static/upimgback.html');
	url.searchParams.set('mime', mime);
	url.searchParams.set('data', '1');
	url.searchParams.set('url', '0');
	url.searchParams.set('markpos', '1');
	url.searchParams.set('logo', '');
	url.searchParams.set('nick', '');
	url.searchParams.set('marks', '1');
	url.searchParams.set('app', 'miniblog');
	url.searchParams.set('s', 'rdxt');
	url.searchParams.set('pri', '0');
	url.searchParams.set('file_source', '1');

	const csrf = store.getCsrf();
	const resp = await fetch(url.toString(), {
		method: 'POST',
		headers: {
			...getWeiboHeaders(store.getCookieString(), csrf),
			'Content-Type': mime,
		},
		body: buffer,
	});

	if (!resp.ok) {
		throw new CliError(
			`Weibo 图片上传失败: ${resp.status} ${resp.statusText}`,
			resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
		);
	}

	const text = await resp.text();
	const picId = extractPicId(text);
	if (!picId) {
		throw new CliError('Weibo 图片上传成功但未返回 pic_id', ExitCode.PROTOCOL);
	}

	return picId;
}

/**
 * Pic upload responses come in several shapes depending on the cb param
 * (XML, JSON, or HTML with embedded JSON). Try each in order.
 */
function extractPicId(payload: string): string | undefined {
	// XML: <pic_id>xxx</pic_id>
	const xmlMatch = /<pic_id>([\w\d]+)<\/pic_id>/.exec(payload);
	if (xmlMatch?.[1]) return xmlMatch[1];

	// JSON: {"pic_id":"xxx"} or {"data":{"pic_id":"xxx"}}
	const jsonMatch = /"pic_id"\s*:\s*"([\w\d]+)"/.exec(payload);
	if (jsonMatch?.[1]) return jsonMatch[1];

	// HTML callback: window.parent.upimg(...,{pic_id:"xxx",...})
	const callbackMatch = /pic_id\s*[:=]\s*"([\w\d]+)"/.exec(payload);
	if (callbackMatch?.[1]) return callbackMatch[1];

	return undefined;
}
