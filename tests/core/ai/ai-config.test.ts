import process from 'node:process';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {readFileMock, writeFileMock, mkdirMock} = vi.hoisted(() => ({
	readFileMock: vi.fn(),
	writeFileMock: vi.fn(),
	mkdirMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
	readFile: readFileMock,
	writeFile: writeFileMock,
	mkdir: mkdirMock,
}));

vi.mock('../../../source/core/utils/config', () => ({
	aiConfigFile: 'D:/tmp/.zget-cli/ai-config.json',
}));

import {AiConfigStore} from '../../../source/core/ai/ai-config';

describe('AiConfigStore', () => {
	const originalEnv = {...process.env};

	beforeEach(() => {
		readFileMock.mockReset();
		writeFileMock.mockReset();
		mkdirMock.mockReset();
		process.env = {...originalEnv};
		delete process.env.AI_PROVIDER;
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.DEEPSEEK_API_KEY;
		delete process.env.AI_API_KEY;
		delete process.env.AI_MODEL;
		delete process.env.AI_BASE_URL;
		delete process.env.AI_LANGUAGE;
	});

	afterEach(() => {
		process.env = {...originalEnv};
	});

	it('loads saved config from disk before consulting the environment', async () => {
		readFileMock.mockResolvedValue(
			JSON.stringify({
				provider: 'custom',
				apiKey: 'disk-key',
				model: 'disk-model',
			}),
		);

		const store = new AiConfigStore();
		await store.load();

		expect(store.isConfigured()).toBe(true);
		expect(store.getConfig()).toEqual({
			provider: 'custom',
			apiKey: 'disk-key',
			model: 'disk-model',
		});
	});

	it('falls back to environment variables and detects the provider when needed', async () => {
		readFileMock.mockRejectedValue(new Error('missing'));
		process.env.DEEPSEEK_API_KEY = 'deepseek-key';
		process.env.AI_MODEL = 'deepseek-chat';
		process.env.AI_BASE_URL = 'https://api.deepseek.com';

		const store = new AiConfigStore();
		await store.load();

		expect(store.getConfig()).toEqual({
			provider: 'deepseek',
			apiKey: 'deepseek-key',
			model: 'deepseek-chat',
			baseUrl: 'https://api.deepseek.com',
			language: 'zh',
		});
	});

	it('prefers explicit provider configuration and defaults language to zh', async () => {
		readFileMock.mockRejectedValue(new Error('missing'));
		process.env.AI_PROVIDER = 'anthropic';
		process.env.AI_API_KEY = 'manual-key';

		const store = new AiConfigStore();
		await store.load();

		expect(store.getConfig()).toEqual({
			provider: 'anthropic',
			apiKey: 'manual-key',
			model: undefined,
			baseUrl: undefined,
			language: 'zh',
		});
	});

	it('saves config back to disk', async () => {
		const store = new AiConfigStore();
		const config = {
			provider: 'openai' as const,
			apiKey: 'saved-key',
			model: 'gpt-4o-mini',
			language: 'en' as const,
		};

		await store.save(config);

		expect(mkdirMock).toHaveBeenCalledWith('D:/tmp/.zget-cli', {
			recursive: true,
		});
		expect(writeFileMock).toHaveBeenCalledWith(
			'D:/tmp/.zget-cli/ai-config.json',
			JSON.stringify(config, null, 2),
		);
		expect(store.getConfig()).toEqual(config);
		expect(store.isConfigured()).toBe(true);
	});

	it('stays unconfigured when no file or environment credentials exist', async () => {
		readFileMock.mockRejectedValue(new Error('missing'));

		const store = new AiConfigStore();
		await store.load();

		expect(store.isConfigured()).toBe(false);
		expect(store.getConfig()).toBeUndefined();
	});
});
