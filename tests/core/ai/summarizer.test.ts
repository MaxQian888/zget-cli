import {afterEach, describe, expect, it, vi} from 'vitest';
import {summarize} from '../../../source/core/ai/summarizer';

describe('summarize', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('calls the OpenAI-compatible endpoint with default model and parses bullet output', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: '一句总结。\n- 第一条\n- 第二条',
						},
					},
				],
				usage: {total_tokens: 321},
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await summarize(
			{
				title: '示例文章',
				platform: '知乎',
				contentType: 'article',
				content: '正文内容',
			},
			{
				provider: 'openai',
				apiKey: 'sk-openai',
			},
		);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.openai.com/v1/chat/completions',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer sk-openai',
				}),
			}),
		);
		expect(result).toEqual({
			summary: '一句总结。',
			keyPoints: ['第一条', '第二条'],
			model: 'gpt-4o-mini',
			tokensUsed: 321,
		});
	});

	it('uses DeepSeek defaults and truncates overlong content', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: '最终总结',
						},
					},
				],
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		await summarize(
			{
				contentType: 'comments',
				content: 'x'.repeat(100_001),
			},
			{
				provider: 'deepseek',
				apiKey: 'deepseek-key',
			},
		);

		const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(String(request.body)) as {
			model: string;
			messages: Array<{role: string; content: string}>;
		};

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.deepseek.com/v1/chat/completions',
			expect.any(Object),
		);
		expect(body.model).toBe('deepseek-chat');
		expect(body.messages[1]?.content).toContain('[内容已截断...]');
	});

	it('uses Anthropic-specific request and token accounting', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				content: [{text: '摘要\n* 要点一\n* 要点二'}],
				usage: {input_tokens: 11, output_tokens: 29},
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await summarize(
			{
				contentType: 'thread',
				content: 'thread body',
			},
			{
				provider: 'anthropic',
				apiKey: 'anthropic-key',
			},
		);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.anthropic.com/v1/messages',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-api-key': 'anthropic-key',
					'anthropic-version': '2023-06-01',
				}),
			}),
		);
		expect(result).toEqual({
			summary: '摘要',
			keyPoints: ['要点一', '要点二'],
			model: 'claude-sonnet-4-20250514',
			tokensUsed: 40,
		});
	});

	it('throws an actionable error when the AI request fails', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			text: async () => 'server exploded',
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			summarize(
				{
					content: 'body',
				},
				{
					provider: 'openai',
					apiKey: 'broken',
				},
			),
		).rejects.toThrow('AI API error (500): server exploded');
	});
});
