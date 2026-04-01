import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import SummaryCommand from '../../../source/commands/summary';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	configStore: {
		load: vi.fn(),
		isConfigured: vi.fn(),
		getConfig: vi.fn(),
	},
	summarize: vi.fn(),
	extractContentForSummary: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/ai/ai-config', () => ({
	AiConfigStore: class MockAiConfigStore {
		constructor() {
			return mocks.configStore;
		}
	},
}));

vi.mock('../../../source/core/ai/summarizer', () => ({
	summarize: mocks.summarize,
}));

vi.mock('../../../source/core/ai/content-extractor', () => ({
	extractContentForSummary: mocks.extractContentForSummary,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.configStore.load.mockResolvedValue(undefined);
	mocks.configStore.isConfigured.mockReturnValue(true);
	mocks.configStore.getConfig.mockReturnValue({
		provider: 'openai',
		apiKey: 'sk-test',
	});
	mocks.extractContentForSummary.mockResolvedValue({
		text: '原文内容',
		title: 'OpenAI 发布',
		platform: 'x',
		contentType: 'social-post',
	});
	mocks.summarize.mockResolvedValue({
		summary: '这是摘要',
		keyPoints: ['要点一', '要点二'],
		model: 'gpt-4o-mini',
		tokensUsed: 42,
	});
});

describe('SummaryCommand', () => {
	it('renders the human summary view after processing content', async () => {
		const view = render(
			<SummaryCommand url="https://x.com/openai/status/1" flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('初始化...');

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('OpenAI 发布');
		expect(frame).toContain('来源: x | 模型: gpt-4o-mini');
		expect(frame).toContain('这是摘要');
		expect(frame).toContain('• 要点一');
		expect(frame).toContain('• 要点二');
	});

	it('renders raw json output when requested', async () => {
		const view = render(
			<SummaryCommand
				url="https://x.com/openai/status/1"
				flags={baseFlags}
				format="json"
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"platform": "x"');
		expect(frame).toContain('"summary": "这是摘要"');
		expect(frame).toContain('"tokensUsed": 42');
	});

	it('shows the AI configuration guidance when no provider is configured', async () => {
		mocks.configStore.isConfigured.mockReturnValue(false);

		const view = render(
			<SummaryCommand url="https://x.com/openai/status/1" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('AI 未配置');
		expect(frame).toContain('OPENAI_API_KEY');
		expect(frame).toContain('请检查 URL 和 AI 配置是否正确');
	});
});
