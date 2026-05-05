import {Text} from 'ink';
import {render} from 'ink-testing-library';
import {describe, expect, it, vi} from 'vitest';
import UiHomeCommand from '../../../source/commands/ui-home';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

vi.mock('../../../source/commands/ui-account-center', () => ({
	default() {
		return <Text>ui-account-center</Text>;
	},
}));

setupCommandTestHarness();

describe('UiHomeCommand', () => {
	it('renders the mixed navigation home screen', () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		const frame = view.lastFrame() ?? '';

		expect(frame).toContain('Download');
		expect(frame).toContain('Browse');
		expect(frame).toContain('Account Center');
		expect(frame).toContain('Summary');
		expect(frame).toContain('Zhihu');
		expect(frame).toContain('XHS');
	});

	it('opens the account center when Account Center is selected and submitted', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);

		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('\r');
		await flushAsync();

		expect(view.lastFrame()).toContain('ui-account-center');
	});
});
