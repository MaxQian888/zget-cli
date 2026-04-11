import {render} from 'ink-testing-library';
import {describe, expect, it, vi} from 'vitest';
import UiAccountPlatformCommand from '../../../source/commands/ui-account-platform';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	getPlatformAccountState: vi.fn(),
	runPlatformAction: vi.fn(),
}));

vi.mock('../../../source/core/account/account-status', () => ({
	getPlatformAccountState: mocks.getPlatformAccountState,
}));

vi.mock('../../../source/core/account/platform-actions', () => ({
	runPlatformAction: mocks.runPlatformAction,
}));

setupCommandTestHarness();

describe('UiAccountPlatformCommand', () => {
	it('renders identity, credential source, and diagnostics for the selected platform', async () => {
		mocks.getPlatformAccountState.mockResolvedValue({
			platform: 'x',
			status: 'ready',
			credentialSource: 'env',
			identity: {
				id: '42',
				displayName: 'OpenAI',
				handle: '@tester',
			},
			lastValidatedAt: '2026-04-11T13:00:00.000Z',
			latestError: 'stale error',
		});

		const view = render(
			<UiAccountPlatformCommand platform="x" flags={baseFlags} />,
		);
		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Platform: x');
		expect(frame).toContain('OpenAI');
		expect(frame).toContain('@tester');
		expect(frame).toContain('Credential source: env');
		expect(frame).toContain('Last checked: 2026-04-11T13:00:00.000Z');
		expect(frame).toContain('Latest error: stale error');
	});

	it('rechecks and refreshes the displayed state after the action succeeds', async () => {
		mocks.getPlatformAccountState.mockResolvedValue({
			platform: 'x',
			status: 'detected',
			credentialSource: 'env',
		});
		mocks.runPlatformAction.mockResolvedValue({
			ok: true,
			action: 'recheck',
			message: 'Rechecked x account state.',
			state: {
				platform: 'x',
				status: 'ready',
				credentialSource: 'env',
				lastValidatedAt: '2026-04-11T13:10:00.000Z',
			},
		});

		const view = render(
			<UiAccountPlatformCommand platform="x" flags={baseFlags} />,
		);
		await flushAsync();

		view.stdin.write('\r');
		await flushAsync();

		expect(mocks.runPlatformAction).toHaveBeenCalledWith('x', 'recheck');
		expect(view.lastFrame()).toContain('Status: ready');
		expect(view.lastFrame()).toContain(
			'Last checked: 2026-04-11T13:10:00.000Z',
		);
	});
});
