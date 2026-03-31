import {useApp} from 'ink';

type InkAppControls = {
	exit: () => void;
};

export function useInkApp(): InkAppControls {
	const typedUseApp = useApp as () => InkAppControls;
	return typedUseApp();
}
