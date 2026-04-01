import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TwitterInteractCommand from '../../../source/commands/x-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credentialStore: {
		load: vi.fn(),
	},
	api: {
		parseTweetId: vi.fn(),
		postTweet: vi.fn(),
		replyToTweet: vi.fn(),
		quoteTweet: vi.fn(),
		deleteTweet: vi.fn(),
		likeTweet: vi.fn(),
		retweet: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/x-auth', () => ({
	XCredentialStore: class MockCredentialStore {
		constructor() {
			return mocks.credentialStore;
		}
	},
}));

vi.mock('../../../source/core/api/x-api', () => ({
	XApi: class MockXApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.credentialStore.load.mockResolvedValue(undefined);
	mocks.api.parseTweetId.mockImplementation((input: string) =>
		input.replaceAll('url:', ''),
	);
	mocks.api.postTweet.mockResolvedValue({data: {id: 'post-1', text: 'hello'}});
	mocks.api.replyToTweet.mockResolvedValue({
		data: {id: 'reply-1', text: 'reply'},
	});
	mocks.api.quoteTweet.mockResolvedValue({
		data: {id: 'quote-1', text: 'quote'},
	});
	mocks.api.deleteTweet.mockResolvedValue({data: {deleted: true}});
	mocks.api.likeTweet.mockResolvedValue({data: {liked: true}});
	mocks.api.retweet.mockResolvedValue({data: {retweeted: true}});
});

describe('TwitterInteractCommand', () => {
	it.each([
		{
			name: 'posts a tweet',
			props: {interactType: 'x-post', target: 'hello world'},
			expected: '推文已发送 (ID: post-1)',
		},
		{
			name: 'replies to a tweet',
			props: {
				interactType: 'x-reply',
				target: 'url:reply-123',
				text: 'thanks',
			},
			expected: '回复已发送 (ID: reply-1)',
		},
		{
			name: 'quotes a tweet',
			props: {
				interactType: 'x-quote',
				target: 'url:quote-123',
				text: 'look at this',
			},
			expected: '引用推文已发送 (ID: quote-1)',
		},
		{
			name: 'deletes a tweet',
			props: {interactType: 'x-delete', target: 'url:delete-123'},
			expected: '推文 delete-123 已删除',
		},
		{
			name: 'likes a tweet',
			props: {interactType: 'x-like', target: 'url:like-123'},
			expected: '已点赞推文 like-123',
		},
		{
			name: 'retweets a tweet',
			props: {interactType: 'x-retweet', target: 'url:rt-123'},
			expected: '已转推 rt-123',
		},
	])('$name', async ({props, expected}) => {
		const view = render(
			<TwitterInteractCommand {...props} flags={baseFlags} />,
		);

		expect(view.lastFrame()).toContain('正在处理...');

		await flushAsync();

		expect(view.lastFrame()).toContain(expected);
	});

	it('renders raw json output when requested', async () => {
		const view = render(
			<TwitterInteractCommand
				interactType="x-post"
				target="json tweet"
				flags={baseFlags}
				format="json"
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"id": "post-1"');
		expect(frame).toContain('"text": "hello"');
	});

	it('shows a validation error when reply text is missing', async () => {
		const view = render(
			<TwitterInteractCommand
				interactType="x-reply"
				target="url:reply-123"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('请提供回复内容');
		expect(frame).toContain('请检查 X API 凭证和参数是否正确');
	});
});
