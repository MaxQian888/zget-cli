import {render} from 'ink-testing-library';
import {describe, expect, it} from 'vitest';
import App from '../../source/app';

describe('App', () => {
	it('renders the default greeting', () => {
		const {lastFrame} = render(<App />);

		expect(lastFrame()).toBe('Hello, Stranger');
	});

	it('renders a provided name', () => {
		const {lastFrame} = render(<App name="Jane" />);

		expect(lastFrame()).toBe('Hello, Jane');
	});

	it('renders helper text in interactive mode', () => {
		const {lastFrame} = render(<App isInteractive />);

		expect(lastFrame()).toContain('Hello, Stranger');
		expect(lastFrame()).toContain('Press q to quit');
	});
});
