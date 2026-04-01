import path from 'node:path';
import {describe, expect, it, vi} from 'vitest';

const {mkdirMock} = vi.hoisted(() => ({
	mkdirMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	mkdir: mkdirMock,
}));

import {
	aiConfigFile,
	biliCookieFile,
	configDir,
	cookieFile,
	defaultOutputDir,
	downloadsStateDir,
	ensureConfigDir,
	qrCodeImagePath,
	xCredentialsFile,
	xhsCookieFile,
	xhsTokenFile,
} from '../../../source/core/utils/config';

describe('config paths', () => {
	it('derives runtime paths under the home config directory', () => {
		expect(path.basename(configDir)).toBe('.zget-cli');
		expect(cookieFile).toBe(path.join(configDir, 'cookies.json'));
		expect(downloadsStateDir).toBe(path.join(configDir, 'downloads'));
		expect(qrCodeImagePath).toBe(path.join(configDir, 'login_qrcode.png'));
		expect(xCredentialsFile).toBe(path.join(configDir, 'x-credentials.json'));
		expect(xhsCookieFile).toBe(path.join(configDir, 'xhs-cookies.json'));
		expect(xhsTokenFile).toBe(path.join(configDir, 'xhs-tokens.json'));
		expect(biliCookieFile).toBe(path.join(configDir, 'bili-cookies.json'));
		expect(aiConfigFile).toBe(path.join(configDir, 'ai-config.json'));
		expect(defaultOutputDir).toBe('./zhihu-downloads');
	});

	it('creates the config and download state directories', async () => {
		await ensureConfigDir();

		expect(mkdirMock).toHaveBeenNthCalledWith(1, configDir, {recursive: true});
		expect(mkdirMock).toHaveBeenNthCalledWith(2, downloadsStateDir, {
			recursive: true,
		});
	});
});
