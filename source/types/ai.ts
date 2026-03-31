export type AiProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export type AiConfig = {
	provider: AiProvider;
	apiKey: string;
	model?: string;
	baseUrl?: string;
	maxTokens?: number;
	language?: 'zh' | 'en';
};

export type SummaryRequest = {
	content: string;
	title?: string;
	platform?: string;
	contentType?:
		| 'article'
		| 'video-subtitle'
		| 'social-post'
		| 'thread'
		| 'comments';
};

export type SummaryResult = {
	summary: string;
	keyPoints?: string[];
	model: string;
	tokensUsed?: number;
};
