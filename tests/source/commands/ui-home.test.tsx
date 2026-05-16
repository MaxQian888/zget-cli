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

vi.mock('../../../source/commands/ui-account-platform', () => ({
	default() {
		return <Text>ui-account-platform</Text>;
	},
}));

setupCommandTestHarness();

const ARROW_DOWN = '[B';
const ARROW_UP = '[A';
const ESC = '';

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

	it('navigates with arrow keys (down then up)', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);

		view.stdin.write(ARROW_DOWN);
		await flushAsync();
		view.stdin.write(ARROW_DOWN);
		await flushAsync();
		view.stdin.write(ARROW_UP);
		await flushAsync();
		view.stdin.write('\r');
		await flushAsync();

		// Down × 2 then up × 1 → index 1 (Browse), so account-center should NOT open.
		expect(view.lastFrame()).not.toContain('ui-account-center');
		expect(view.lastFrame()).toContain('Browse');
	});

	it('does not open account-center if a non-target item is selected', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		view.stdin.write('\r');
		await flushAsync();
		expect(view.lastFrame()).not.toContain('ui-account-center');
	});

	it('clamps the selection at the top with k at index 0', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		view.stdin.write('k');
		await flushAsync();
		view.stdin.write('k');
		await flushAsync();
		// Still at index 0 — pressing enter shouldn't open the account center.
		view.stdin.write('\r');
		await flushAsync();
		expect(view.lastFrame()).not.toContain('ui-account-center');
	});

	it('clamps the selection at the bottom past the last item', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		// Press down 10× — far past the 4 actionItems.
		for (let i = 0; i < 10; i += 1) {
			view.stdin.write('j');
			// eslint-disable-next-line no-await-in-loop
			await flushAsync();
		}

		// We're now on the last item ("Summary"), pressing enter should NOT route to
		// account-center.
		view.stdin.write('\r');
		await flushAsync();
		expect(view.lastFrame()).not.toContain('ui-account-center');
	});

	it('returns home from account-center when Escape is pressed', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('\r');
		await flushAsync();
		expect(view.lastFrame()).toContain('ui-account-center');

		view.stdin.write(ESC);
		await flushAsync();
		expect(view.lastFrame()).not.toContain('ui-account-center');
		expect(view.lastFrame()).toContain('Account Center');
	});

	it('returns home from account-center when q is pressed', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('\r');
		await flushAsync();
		expect(view.lastFrame()).toContain('ui-account-center');

		view.stdin.write('q');
		await flushAsync();
		expect(view.lastFrame()).toContain('Common actions');
	});

	it('keystrokes on non-home screen with neither esc/q do nothing', async () => {
		const view = render(<UiHomeCommand flags={baseFlags} />);
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('j');
		await flushAsync();
		view.stdin.write('\r');
		await flushAsync();
		expect(view.lastFrame()).toContain('ui-account-center');
		view.stdin.write('j');
		await flushAsync();
		expect(view.lastFrame()).toContain('ui-account-center');
	});
});
