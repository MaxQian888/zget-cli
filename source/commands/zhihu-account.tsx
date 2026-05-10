import {rm} from 'node:fs/promises';
import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import QRCode from 'qrcode';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {useInkApp} from '../core/utils/ink-app';
import {CookieStore} from '../core/auth/cookie-store';
import {performQrLogin} from '../core/auth/qr-login';
import {ApiClient} from '../core/api/client';
import {ZhihuApi} from '../core/api/zhihu-api';
import {cookieFile} from '../core/utils/config';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import QrCodeStatus from '../components/qr-code';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type ZhihuAccountKind =
	| 'zhihu-login'
	| 'zhihu-logout'
	| 'zhihu-whoami'
	| 'zhihu-status';

type Props = {
	readonly kind: ZhihuAccountKind;
	readonly cookie?: string;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

type QrStatus =
	| 'loading'
	| 'waiting'
	| 'scanned'
	| 'confirmed'
	| 'expired'
	| 'error';

export default function ZhihuAccountCommand({
	kind,
	cookie,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [message, setMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();
	const [qrStatus, setQrStatus] = useState<QrStatus>('loading');
	const [qrDisplay, setQrDisplay] = useState<string>('');
	const [qrLink, setQrLink] = useState<string>('');

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				switch (kind) {
					case 'zhihu-login': {
						await runLogin({
							cookie,
							flagsCookies: flags.cookies,
							async onQrReady(link) {
								setQrLink(link);
								try {
									const qrString = await QRCode.toString(link, {
										type: 'terminal',
										small: true,
									});
									setQrDisplay(qrString);
								} catch {
									// Fallback to link.
								}
							},
							onStatusChange(next: QrStatus) {
								setQrStatus(next);
							},
						});
						setMessage('登录成功');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify(
									{ok: true, data: {action: 'zhihu-login'}},
									null,
									2,
								),
							);
						}

						break;
					}

					case 'zhihu-logout': {
						await rm(cookieFile, {force: true});
						setMessage('已退出登录');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify(
									{ok: true, data: {action: 'zhihu-logout'}},
									null,
									2,
								),
							);
						}

						break;
					}

					case 'zhihu-status': {
						const store = new CookieStore();
						await store.load();
						const authenticated = store.isAuthenticated();
						setMessage(authenticated ? '本地已登录' : '本地未登录');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify({ok: true, data: {authenticated}}, null, 2),
							);
						}

						break;
					}

					case 'zhihu-whoami': {
						const me = await runWhoami(flags.cookies);
						setMessage(`${me.name} (@${me.urlToken})`);
						if (format === 'json') {
							setJsonOutput(JSON.stringify({ok: true, data: me}, null, 2));
						}

						break;
					}

					default: {
						throw new Error(`Unsupported zhihu account kind: ${String(kind)}`);
					}
				}

				setLoading(false);
			} catch (error_: unknown) {
				const errorMessage =
					error_ instanceof Error ? error_.message : String(error_);
				pendingExitCode = getExitCode(error_);
				const hint = getErrorHint(error_);
				setError(errorMessage);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: false,
								error: {code: pendingExitCode, message: errorMessage, hint},
							},
							null,
							2,
						),
					);
				}

				setLoading(false);
			} finally {
				setTimeout(() => {
					exit(pendingExitCode);
				}, 200);
			}
		};

		void run();
	});

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion='请运行 "zget zhihu login" 后重试'
			/>
		);
	}

	if (kind === 'zhihu-login') {
		return (
			<Box flexDirection="column">
				<Text bold>zget — 知乎登录</Text>
				{qrDisplay ? (
					<Box marginTop={1}>
						<Text>{qrDisplay}</Text>
					</Box>
				) : null}
				<Box marginTop={1}>
					<QrCodeStatus status={qrStatus} />
				</Box>
				{qrLink && qrStatus === 'waiting' ? (
					<Box marginTop={1}>
						<Text dimColor>
							若终端无法显示二维码，请手机浏览器打开: {qrLink}
						</Text>
					</Box>
				) : null}
				{!loading && message ? (
					<Box marginTop={1}>
						<Text color="green">{message}</Text>
					</Box>
				) : null}
			</Box>
		);
	}

	if (loading) {
		return (
			<Box>
				<Spinner label="" />
				<Text> 正在处理...</Text>
			</Box>
		);
	}

	return (
		<Box>
			<Text color="green">{message}</Text>
		</Box>
	);
}

async function runLogin(options: {
	cookie?: string;
	flagsCookies?: string;
	onQrReady: (link: string) => Promise<void>;
	onStatusChange: (status: QrStatus) => void;
}): Promise<void> {
	const cookieString = options.cookie ?? options.flagsCookies;
	if (cookieString) {
		const store = new CookieStore();
		store.parseCookieString(cookieString);
		if (!store.isAuthenticated()) {
			throw new Error('Cookie 缺少必需字段（z_c0 / _xsrf / d_c0）');
		}

		const api = new ZhihuApi(new ApiClient({cookieStore: store}));
		const result = await api.validateSession();
		if (!result.valid) {
			throw new Error('未登录：cookie 已失效');
		}

		await store.save();
		options.onStatusChange('confirmed');
		return;
	}

	await performQrLogin({
		async onQrReady(link) {
			await options.onQrReady(link);
		},
		onStatusChange(newStatus) {
			options.onStatusChange(newStatus as QrStatus);
		},
	});
}

async function runWhoami(rawCookies?: string): Promise<{
	id: string;
	name: string;
	urlToken: string;
	headline: string;
	avatarUrl: string;
	email?: string;
}> {
	const store = new CookieStore();
	await store.load();
	if (rawCookies) {
		store.parseCookieString(rawCookies);
	}

	if (!store.isAuthenticated()) {
		throw new Error('未登录，请先运行 "zget zhihu login"');
	}

	const api = new ZhihuApi(new ApiClient({cookieStore: store}));
	return api.getMe();
}
