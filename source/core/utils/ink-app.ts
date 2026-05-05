import process from 'node:process';
import {useApp} from 'ink';
import {ExitCode, type ExitCodeValue} from './exit-codes';

type RawInkAppControls = {
	exit: (error?: Error) => void;
};

type InkAppControls = {
	exit: (code?: ExitCodeValue) => void;
};

export function useInkApp(): InkAppControls {
	const typedUseApp = useApp as () => RawInkAppControls;
	const raw = typedUseApp();
	return {
		exit(code = ExitCode.OK) {
			if (code !== ExitCode.OK) {
				process.exitCode = code;
			}

			raw.exit();
		},
	};
}
