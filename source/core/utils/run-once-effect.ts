import {useEffect, useRef} from 'react';

type EffectCallback = () => void;

export function useRunOnceEffect(effect: EffectCallback): void {
	const effectRef = useRef(effect);
	effectRef.current = effect;

	useEffect(() => {
		effectRef.current();
	}, []);
}
