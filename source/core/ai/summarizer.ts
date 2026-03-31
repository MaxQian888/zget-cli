import type {AiConfig, SummaryRequest, SummaryResult} from '../../types/ai';

const authorizationHeader = 'Authorization';
const maxTokensKey = 'max_tokens';

function buildSystemPrompt(request: SummaryRequest): string {
	const lang = '请用中文回答。';
	const base = `你是一个内容摘要助手。${lang}`;

	switch (request.contentType) {
		case 'video-subtitle': {
			return `${base}以下是一个视频的字幕文本。请总结视频的主要内容，提取3-5个要点。`;
		}

		case 'article': {
			return `${base}以下是一篇文章。请总结文章的主要内容，提取3-5个要点。`;
		}

		case 'social-post': {
			return `${base}以下是一条社交媒体帖子。请简要总结其内容和要点。`;
		}

		case 'thread': {
			return `${base}以下是一个讨论串/帖子。请总结讨论的主要内容和观点。`;
		}

		case 'comments': {
			return `${base}以下是一些评论。请总结主要观点和讨论方向。`;
		}

		default: {
			return `${base}请总结以下内容，提取3-5个要点。`;
		}
	}
}

function buildUserPrompt(request: SummaryRequest): string {
	const parts: string[] = [];

	if (request.title) {
		parts.push(`标题: ${request.title}`);
	}

	if (request.platform) {
		parts.push(`来源: ${request.platform}`);
	}

	parts.push(
		'',
		request.content,
		'',
		'请提供:',
		'1. 一段简洁的总结（200字以内）',
		'2. 3-5个要点（每个要点一行，以"- "开头）',
	);

	return parts.join('\n');
}

async function callOpenAiCompatible(
	request: SummaryRequest,
	config: AiConfig,
): Promise<SummaryResult> {
	const baseUrl =
		config.baseUrl ??
		(config.provider === 'deepseek'
			? 'https://api.deepseek.com'
			: 'https://api.openai.com');

	const model =
		config.model ??
		(config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini');

	const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			[authorizationHeader]: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{role: 'system', content: buildSystemPrompt(request)},
				{role: 'user', content: buildUserPrompt(request)},
			],
			[maxTokensKey]: config.maxTokens ?? 2000,
			temperature: 0.3,
		}),
	});

	if (!resp.ok) {
		const errorText = await resp.text();
		throw new Error(`AI API error (${resp.status}): ${errorText}`);
	}

	const json = (await resp.json()) as {
		choices: Array<{message: {content: string}}>;
		usage?: {total_tokens: number};
	};

	const content = json.choices[0]?.message?.content ?? '';
	return parseAiResponse(content, model, json.usage?.total_tokens);
}

async function callAnthropic(
	request: SummaryRequest,
	config: AiConfig,
): Promise<SummaryResult> {
	const baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
	const model = config.model ?? 'claude-sonnet-4-20250514';

	const resp = await fetch(`${baseUrl}/v1/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': config.apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model,
			system: buildSystemPrompt(request),
			messages: [{role: 'user', content: buildUserPrompt(request)}],
			[maxTokensKey]: config.maxTokens ?? 2000,
		}),
	});

	if (!resp.ok) {
		const errorText = await resp.text();
		throw new Error(`Anthropic API error (${resp.status}): ${errorText}`);
	}

	const json = (await resp.json()) as {
		content: Array<{text: string}>;
		usage?: {input_tokens: number; output_tokens: number};
	};

	const content = json.content[0]?.text ?? '';
	const tokensUsed = json.usage
		? json.usage.input_tokens + json.usage.output_tokens
		: undefined;

	return parseAiResponse(content, model, tokensUsed);
}

function parseAiResponse(
	content: string,
	model: string,
	tokensUsed?: number,
): SummaryResult {
	// Try to extract key points (lines starting with "- ")
	const lines = content.split('\n');
	const keyPoints: string[] = [];
	const summaryLines: string[] = [];

	let inKeyPoints = false;
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
			inKeyPoints = true;
			keyPoints.push(trimmed.slice(2));
		} else if (inKeyPoints && trimmed === '') {
			// End of key points section
		} else if (!inKeyPoints && trimmed) {
			summaryLines.push(trimmed);
		}
	}

	return {
		summary: keyPoints.length > 0 ? summaryLines.join('\n') : content,
		keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
		model,
		tokensUsed,
	};
}

export async function summarize(
	request: SummaryRequest,
	config: AiConfig,
): Promise<SummaryResult> {
	// Truncate content if too long (roughly 100k chars ~ 25k tokens)
	const maxContentLength = 100_000;
	if (request.content.length > maxContentLength) {
		request = {
			...request,
			content:
				request.content.slice(0, maxContentLength) + '\n\n[内容已截断...]',
		};
	}

	if (config.provider === 'anthropic') {
		return callAnthropic(request, config);
	}

	return callOpenAiCompatible(request, config);
}
