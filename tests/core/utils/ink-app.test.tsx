import {Text, useApp} from 'ink';
import {render} from 'ink-testing-library';
import {useEffect} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {useInkApp} from '../../../source/core/utils/ink-app';

const {exitMock} = vi.hoisted(() => ({
	exitMock: vi.fn(),
}));

vi.mock('ink', async importOriginal => {
	const actual = await importOriginal();
	return {
		...actual,
		useApp: vi.fn(() => ({exit: exitMock})),
	};
});

function Probe(): JSX.Element {
	const {exit} = useInkApp();

	useEffect(() => {
		exit();
	}, [exit]);

	return <Text>probe</Text>;
}

describe('useInkApp', () => {
	it('returns the typed Ink app controls from useApp', () => {
		const {lastFrame, unmount} = render(<Probe />);

		expect(lastFrame()).toContain('probe');
		expect(useApp).toHaveBeenCalledTimes(1);
		expect(exitMock).toHaveBeenCalledTimes(1);

		unmount();
	});
});
