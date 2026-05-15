import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {WeiboCookieStore, performWeiboQrLogin} from '../core/auth/weibo-auth';
import {WeiboApi} from '../core/api/weibo-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import {
	ExitCode,
	type ExitCodeValue,
	getErrorHint,
	getExitCode,
} from '../core/utils/exit-codes';
import type {GlobalFlags} from './types';

type LoginMode = 'weibo-login' | 'weibo-whoami' | 'weibo-logout';

type Props = {
	readonly mode: LoginMode;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function WeiboLoginCommand({
	mode,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading',
	);
	const [message, setMessage] = useState('');
	const [details, setDetails] = useState<Array<{key: string; value: string}>>(
		[],
	);
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();
	const [qrUrl, setQrUrl] = useState<string | undefined>();
	const [scanStatus, setScanStatus] = useState<string>('');

	useRunOnceEffect(() => {
		const run = async () => {
			let pendingExitCode: ExitCodeValue = ExitCode.OK;
			try {
				const cookieStore = new WeiboCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				switch (mode) {
					case 'weibo-login': {
						if (flags.cookies) {
							await cookieStore.save();
							setMessage('Cookie 已保存');
							if (format === 'json') {
								setJsonOutput(
									JSON.stringify(
										{ok: true, data: {source: 'cookies-flag'}},
										null,
										2,
									),
								);
							}

							setStatus('success');
							break;
						}

						setMessage('正在获取二维码...');
						await performWeiboQrLogin({
							onQrReady(imageUrl) {
								setQrUrl(imageUrl);
								setMessage('请使用微博 App 扫描二维码:');
							},
							onStatusChange(qrStatus, message_) {
								switch (qrStatus) {
									case 'waiting': {
										setScanStatus('等待扫码...');
										break;
									}

									case 'scanned': {
										setScanStatus('已扫码，请在手机上确认...');
										break;
									}

									case 'confirmed': {
										setMessage('登录成功！Cookie 已保存');
										if (format === 'json') {
											setJsonOutput(
												JSON.stringify(
													{ok: true, data: {source: 'qr'}},
													null,
													2,
												),
											);
										}

										setStatus('success');
										break;
									}

									case 'expired': {
										setMessage(message_ ?? '二维码已过期，请重新登录');
										setStatus('error');
										break;
									}

									case 'error': {
										setMessage(message_ ?? '登录失败');
										setStatus('error');
										break;
									}

									default: {
										setScanStatus(message_ ?? '状态未知');
										break;
									}
								}
							},
						});
						break;
					}

					case 'weibo-whoami': {
						if (!cookieStore.isAuthenticated()) {
							throw new Error('未登录，请先运行 "zget weibo login"');
						}

						const api = new WeiboApi(cookieStore);
						const user = await api.getMyProfile();
						if (format === 'json') {
							setJsonOutput(JSON.stringify({ok: true, data: user}, null, 2));
							break;
						}

						setDetails([
							{key: '昵称', value: user.screen_name ?? '-'},
							{key: 'UID', value: user.idstr ?? String(user.id)},
							{key: '简介', value: user.description ?? '-'},
							{key: '粉丝', value: String(user.followers_count ?? 0)},
							{key: '关注', value: String(user.friends_count ?? 0)},
							{key: '微博', value: String(user.statuses_count ?? 0)},
						]);
						setMessage('当前登录用户');
						setStatus('success');
						break;
					}

					case 'weibo-logout': {
						cookieStore.clear();
						await cookieStore.save();
						setMessage('已退出登录，Cookie 已清除');
						if (format === 'json') {
							setJsonOutput(
								JSON.stringify({ok: true, data: {cleared: true}}, null, 2),
							);
						}

						setStatus('success');
						break;
					}

					default: {
						throw new Error('Unsupported Weibo login mode');
					}
				}
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				pendingExitCode = getExitCode(error);
				const hint = getErrorHint(error);
				setStatus('error');
				setMessage(errorMessage);
				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{
								ok: false,
								error: {
									code: pendingExitCode,
									message: errorMessage,
									hint,
								},
							},
							null,
							2,
						),
					);
				}
			} finally {
				setTimeout(() => {
					exit(pendingExitCode);
				}, 500);
			}
		};

		void run();
	});

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (status === 'error') {
		return (
			<ErrorDisplay
				message={message}
				suggestion='请重新运行 "zget weibo login" 或使用 --cookies 手动传入 SUB/SUBP'
			/>
		);
	}

	if (status === 'success') {
		return (
			<Box flexDirection="column">
				<Text bold color="green">
					✓ {message}
				</Text>
				{details.map(d => (
					<Box key={d.key} marginLeft={2}>
						<Text bold>{d.key}: </Text>
						<Text>{d.value}</Text>
					</Box>
				))}
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box>
				<Spinner label="" />
				<Text> {message || '正在处理...'}</Text>
			</Box>
			{qrUrl && (
				<Box flexDirection="column" marginTop={1}>
					<Text color="yellow">{qrUrl}</Text>
					<Text dimColor>
						（在浏览器中打开上方链接看到二维码，使用微博 App 扫描）
					</Text>
					{scanStatus && <Text color="cyan">{scanStatus}</Text>}
				</Box>
			)}
		</Box>
	);
}
