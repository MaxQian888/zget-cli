import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {XhsCookieStore} from '../core/auth/xhs-auth';
import {XhsApi} from '../core/api/xhs-api';
import {XhsBrowser} from '../core/api/xhs-browser';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type LoginMode = 'xhs-login' | 'xhs-whoami' | 'xhs-logout' | 'xhs-favorites';

type Props = {
	readonly mode: LoginMode;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function XhsLoginCommand({
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

	useRunOnceEffect(() => {
		// The XHS auth surface intentionally keeps the mode-specific flow explicit.
		// eslint-disable-next-line complexity
		const run = async () => {
			try {
				const cookieStore = new XhsCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				switch (mode) {
					case 'xhs-login': {
						if (flags.cookies) {
							// Manual cookie mode
							cookieStore.parseCookieString(flags.cookies);
							await cookieStore.save();
							setMessage('Cookie 已保存');
							setStatus('success');
							break;
						}

						// Browser-assisted login
						setMessage('正在启动浏览器进行登录...');
						const browser = new XhsBrowser();
						try {
							await browser.launch();
							// Navigate to login page
							await browser.getPageContent('https://www.xiaohongshu.com');

							// Wait for user to scan QR code
							setMessage(
								'请在浏览器中完成登录（扫描二维码或输入手机号）...\n提示: 浏览器以无头模式运行，请使用 --cookies 参数手动传入 cookie',
							);

							// Try to extract cookies after navigation
							const cookies = await browser.extractCookies();
							if (cookies.a1 && cookies.web_session) {
								cookieStore.setCookies(cookies);
								await cookieStore.save();
								setMessage('登录成功！Cookie 已保存');
								setStatus('success');
							} else {
								setMessage(
									'无法自动获取 Cookie。请手动登录后使用:\n\n' +
										'  zget xhs login --cookies "a1=xxx; web_session=xxx"\n\n' +
										'从浏览器 DevTools > Application > Cookies 复制 cookie',
								);
								setStatus('error');
							}
						} finally {
							await browser.close();
						}

						break;
					}

					case 'xhs-whoami': {
						if (!cookieStore.isAuthenticated()) {
							throw new Error('未登录，请先运行 "zget xhs login"');
						}

						const xhsApi = new XhsApi(cookieStore);
						await xhsApi.init();
						try {
							const profile = await xhsApi.getMyProfile();
							if (format === 'json') {
								setJsonOutput(JSON.stringify(profile, null, 2));
								break;
							}

							setDetails([
								{key: '昵称', value: profile.nickname},
								{key: 'ID', value: profile.userId},
								{key: '笔记', value: String(profile.noteCount ?? 0)},
								{key: '粉丝', value: String(profile.followerCount ?? 0)},
								{key: '关注', value: String(profile.followingCount ?? 0)},
								{key: '获赞', value: String(profile.likeCount ?? 0)},
							]);
							setMessage('当前登录用户');
							setStatus('success');
						} finally {
							await xhsApi.close();
						}

						break;
					}

					case 'xhs-logout': {
						cookieStore.clear();
						await cookieStore.save();
						setMessage('已退出登录，Cookie 已清除');
						setStatus('success');
						break;
					}

					case 'xhs-favorites': {
						if (!cookieStore.isAuthenticated()) {
							throw new Error('未登录，请先运行 "zget xhs login"');
						}

						const xhsApi = new XhsApi(cookieStore);
						await xhsApi.init();
						try {
							const items = await xhsApi.getMyFavorites();
							if (format === 'json') {
								setJsonOutput(JSON.stringify(items, null, 2));
								break;
							}

							setMessage('我的收藏');
							const results: Array<{key: string; value: string}> = [];
							for (const [i, item] of items.entries()) {
								results.push({
									key: `${i + 1}`,
									value: `${
										item.title || item.description?.slice(0, 30) || item.noteId
									}  @${item.user.nickname}`,
								});
							}

							setDetails(results);
							setStatus('success');
						} finally {
							await xhsApi.close();
						}

						break;
					}

					default: {
						throw new Error('Unsupported Xiaohongshu login mode');
					}
				}
			} catch (error: unknown) {
				setStatus('error');
				setMessage(error instanceof Error ? error.message : String(error));
			} finally {
				setTimeout(() => {
					exit();
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
				suggestion="确保已安装 Playwright: npx playwright install chromium"
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
		<Box>
			<Spinner label="" />
			<Text> {message || '正在处理...'}</Text>
		</Box>
	);
}
