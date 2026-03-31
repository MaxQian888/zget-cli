import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';

export const configDir = join(homedir(), '.zget-cli');
export const cookieFile = join(configDir, 'cookies.json');
export const downloadsStateDir = join(configDir, 'downloads');
export const qrCodeImagePath = join(configDir, 'login_qrcode.png');

// X (Twitter)
export const xCredentialsFile = join(configDir, 'x-credentials.json');

// XHS (Xiaohongshu)
export const xhsCookieFile = join(configDir, 'xhs-cookies.json');
export const xhsTokenFile = join(configDir, 'xhs-tokens.json');

// Bilibili
export const biliCookieFile = join(configDir, 'bili-cookies.json');

// AI
export const aiConfigFile = join(configDir, 'ai-config.json');

export const defaultOutputDir = './zhihu-downloads';

export async function ensureConfigDir(): Promise<void> {
	await mkdir(configDir, {recursive: true});
	await mkdir(downloadsStateDir, {recursive: true});
}
