import {render} from 'ink-testing-library';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from '../../source/app';

type InputKey = {
	readonly escape?: boolean;
	readonly backspace?: boolean;
	readonly delete?: boolean;
	readonly return?: boolean;
	readonly tab?: boolean;
	readonly upArrow?: boolean;
	readonly downArrow?: boolean;
	readonly leftArrow?: boolean;
	readonly rightArrow?: boolean;
	readonly ctrl?: boolean;
	readonly meta?: boolean;
};

let capturedInputHandler: ((input: string, key: InputKey) => void) | undefined;
const exitSpy = vi.fn();

vi.mock('ink', async () => {
	const actual = await vi.importActual('ink');

	return {
		...actual,
		useApp() {
			return {exit: exitSpy};
		},
		useInput(handler: (input: string, key: InputKey) => void) {
			capturedInputHandler = handler;
		},
	};
});

function dispatchInput(input: string, key: InputKey = {}) {
	if (!capturedInputHandler) {
		throw new Error('Input handler is not registered');
	}

	capturedInputHandler(input, key);
}

describe('App interactive input handling', () => {
	beforeEach(() => {
		exitSpy.mockReset();
		capturedInputHandler = undefined;
	});

	afterEach(() => {
		capturedInputHandler = undefined;
	});

	it('ignores inputs in non-interactive mode', () => {
		const {lastFrame} = render(<App name="Jane" />);

		dispatchInput('X');
		dispatchInput('', {backspace: true});

		expect(lastFrame()).toBe('Hello, Jane');
	});

	it('exercises interactive input branches for editing and reset keys', () => {
		const {lastFrame} = render(<App isInteractive />);

		dispatchInput('A');
		dispatchInput('B');
		dispatchInput('', {leftArrow: true});
		dispatchInput('Z', {ctrl: true});
		dispatchInput('', {delete: true});
		dispatchInput('', {backspace: true});
		dispatchInput('', {escape: true});

		dispatchInput('', {rightArrow: true});
		dispatchInput('', {upArrow: true});
		dispatchInput('', {downArrow: true});
		dispatchInput('', {return: true});
		dispatchInput('', {tab: true});
		dispatchInput('', {meta: true});
		dispatchInput('', {delete: true});
		dispatchInput('', {backspace: true});
		dispatchInput('', {escape: true});

		expect(lastFrame()).toContain('Hello, Stranger');
		expect(exitSpy).not.toHaveBeenCalled();
	});

	it('calls onExit and Ink exit when q is pressed', () => {
		const onExit = vi.fn();
		render(<App isInteractive onExit={onExit} />);

		dispatchInput('q');

		expect(onExit).toHaveBeenCalledTimes(1);
		expect(exitSpy).toHaveBeenCalledTimes(1);
	});
});
