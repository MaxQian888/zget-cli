import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import process from 'node:process';
import type {AiConfig, AiProvider} from '../../types/ai';
import {aiConfigFile} from '../utils/config';

export class AiConfigStore {
	private config: AiConfig | undefined;

	async load(): Promise<void> {
		// Try config file first
		try {
			const content = await readFile(aiConfigFile, 'utf8');
			this.config = JSON.parse(content) as AiConfig;
			return;
		} catch {
			// No config file
		}

		// Fall back to environment variables
		const provider = process.env.AI_PROVIDER as AiProvider | undefined;
		const apiKey =
			process.env.OPENAI_API_KEY ??
			process.env.ANTHROPIC_API_KEY ??
			process.env.DEEPSEEK_API_KEY ??
			process.env.AI_API_KEY ??
			'';

		if (apiKey) {
			this.config = {
				provider: provider ?? this.detectProvider(apiKey),
				apiKey,
				model: process.env.AI_MODEL,
				baseUrl: process.env.AI_BASE_URL,
				language: (process.env.AI_LANGUAGE as 'zh' | 'en') ?? 'zh',
			};
		}
	}

	async save(config: AiConfig): Promise<void> {
		this.config = config;
		await mkdir(dirname(aiConfigFile), {recursive: true});
		await writeFile(aiConfigFile, JSON.stringify(config, null, 2));
	}

	isConfigured(): boolean {
		return Boolean(this.config?.apiKey);
	}

	getConfig(): AiConfig | undefined {
		return this.config;
	}

	private detectProvider(apiKey: string): AiProvider {
		if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
		if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
		if (apiKey.startsWith('sk-ant-')) return 'anthropic';
		return 'openai';
	}
}
