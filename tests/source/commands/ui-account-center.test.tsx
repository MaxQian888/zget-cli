import {render} from 'ink-testing-library';
import {describe, expect, it, vi} from 'vitest';
import UiAccountCenterCommand from '../../../source/commands/ui-account-center';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	getAccountOverview: vi.fn(),
}));

vi.mock('../../../source/core/account/account-status', () => ({
	getAccountOverview: mocks.getAccountOverview,
}));

setupCommandTestHarness();

describe('UiAccountCenterCommand', () => {
	it('renders normalized platform cards from the overview snapshot', async () => {
		mocks.getAccountOverview.mockResolvedValue([
			{
				platform: 'zhihu',
				status: 'missing',
				credentialSource: 'none',
			},
			{
				platform: 'x',
				status: 'ready',
				credentialSource: 'env',
				identity: {displayName: 'OpenAI', handle: '@openai'},
				lastValidatedAt: '2026-04-11T13:00:00.000Z',
			},
			{
				platform: 'xhs',
				status: 'error',
				credentialSource: 'cookies',
				latestError: 'session expired',
			},
			{platform: 'bili', status: 'detected', credentialSource: 'cookies'},
			{platform: 'ai', status: 'detected', credentialSource: 'file'},
		]);

		const view = render(<UiAccountCenterCommand flags={baseFlags} />);
		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Account Center');
		expect(frame).toContain('zhihu');
		expect(frame).toContain('ready');
		expect(frame).toContain('error');
		expect(frame).toContain('detected');
		expect(frame).toContain('OpenAI');
		expect(frame).toContain('@openai');
		expect(frame).toContain('2026-04-11T13:00:00.000Z');
		expect(frame).toContain('session expired');
	});

	it('selects a platform and calls back when submitted', async () => {
		mocks.getAccountOverview.mockResolvedValue([
			{platform: 'zhihu', status: 'missing', credentialSource: 'none'},
			{platform: 'x', status: 'ready', credentialSource: 'env'},
		]);
		const onSelectPlatform = vi.fn();

		const view = render(
			<UiAccountCenterCommand
				flags={baseFlags}
				onSelectPlatform={onSelectPlatform}
			/>,
		);
		await flushAsync();

		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('\r');
		await flushAsync();

		expect(onSelectPlatform).toHaveBeenCalledWith('x');
	});
});
