import {beforeEach, describe, expect, it, vi} from 'vitest';

const {writeFileMock, mkdirMock, downloadImagesMock} = vi.hoisted(() => ({
	writeFileMock: vi.fn(),
	mkdirMock: vi.fn(),
	downloadImagesMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	readFile: vi.fn(),
	writeFile: writeFileMock,
	mkdir: mkdirMock,
}));

vi.mock('../../../../source/core/downloader/image-downloader', () => ({
	downloadImages: downloadImagesMock,
}));

import {downloadWeiboStatus} from '../../../../source/core/downloader/platforms/weibo-downloader';

const fakeStatus = {
	id: 1,
	idstr: '5145xxx',
	mid: '5145xxx',
	mblogid: 'Pxx88kAbC',
	created_at: '2026-05-01T08:00:00+08:00',
	user: {id: 1_234_567_890, idstr: '1234567890', screen_name: 'TestUser'},
	text_raw: 'Hello Weibo',
	text: 'Hello Weibo',
	source: '',
	pic_ids: ['picA'],
	pic_infos: {
		picA: {largest: {url: 'https://wx1.sinaimg.cn/large/picA.jpg'}},
	},
	reposts_count: 0,
	comments_count: 0,
	attitudes_count: 0,
};

describe('downloadWeiboStatus', () => {
	beforeEach(() => {
		writeFileMock.mockReset();
		mkdirMock.mockReset();
		downloadImagesMock.mockReset();
	});

	it('writes markdown and downloads images when downloadImages=true', async () => {
		const api = {
			getStatus: vi.fn().mockResolvedValue(fakeStatus),
			getLongText: vi.fn(),
			getComments: vi.fn().mockResolvedValue([]),
		} as unknown as Parameters<typeof downloadWeiboStatus>[1];
		downloadImagesMock.mockResolvedValue({downloaded: 1, failed: 0});

		const result = await downloadWeiboStatus('5145xxx', api, {
			outputDir: 'D:/tmp/zget',
			downloadImages: true,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.author).toBe('TestUser');
		expect(result.imageCount).toBe(1);
		expect(result.outputPath.replaceAll('\\', '/')).toContain('/zget/weibo/');
		expect(writeFileMock).toHaveBeenCalledWith(
			expect.stringMatching(/\.md$/),
			expect.stringContaining('# TestUser 的微博'),
			'utf8',
		);
		expect(downloadImagesMock).toHaveBeenCalled();
	});

	it('skips image batch when downloadImages=false', async () => {
		const api = {
			getStatus: vi.fn().mockResolvedValue(fakeStatus),
			getLongText: vi.fn(),
			getComments: vi.fn().mockResolvedValue([]),
		} as unknown as Parameters<typeof downloadWeiboStatus>[1];

		const result = await downloadWeiboStatus('5145xxx', api, {
			outputDir: 'D:/tmp/zget',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(true);
		expect(result.imageCount).toBe(0);
		expect(downloadImagesMock).not.toHaveBeenCalled();
	});

	it('returns failure envelope when API throws', async () => {
		const api = {
			getStatus: vi.fn().mockRejectedValue(new Error('boom')),
		} as unknown as Parameters<typeof downloadWeiboStatus>[1];

		const result = await downloadWeiboStatus('xxx', api, {
			outputDir: 'D:/tmp/zget',
			downloadImages: false,
			verbose: false,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBe('boom');
	});

	it('fetches longText when status.isLongText is true', async () => {
		const longApi = {
			getStatus: vi.fn().mockResolvedValue({
				...fakeStatus,
				isLongText: true,
				pic_ids: undefined,
				pic_infos: undefined,
			}),
			getLongText: vi.fn().mockResolvedValue('Expanded long text'),
			getComments: vi.fn().mockResolvedValue([]),
		} as unknown as Parameters<typeof downloadWeiboStatus>[1];

		await downloadWeiboStatus('5145xxx', longApi, {
			outputDir: 'D:/tmp/zget',
			downloadImages: false,
			verbose: false,
		});

		expect(longApi.getLongText).toHaveBeenCalledWith('5145xxx');
		expect(writeFileMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.stringContaining('Expanded long text'),
			'utf8',
		);
	});
});
