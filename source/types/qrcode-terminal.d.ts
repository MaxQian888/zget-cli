declare module 'qrcode' {
	const toDataUrl: (text: string) => Promise<string>;

	export function toString(
		text: string,
		options?: {type?: string; small?: boolean; margin?: number},
	): Promise<string>;
	export {toDataUrl as toDataURL};
}
