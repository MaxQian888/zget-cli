import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {XCredentialStore} from '../core/auth/x-auth';
import {XApi} from '../core/api/x-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import type {GlobalFlags} from './types';

type Props = {
	readonly flags: GlobalFlags;
};

export default function TwitterLoginCommand({flags: _flags}: Props) {
	const {exit} = useInkApp();
	const [status, setStatus] = useState<
		'checking' | 'configured' | 'missing' | 'error'
	>('checking');
	const [message, setMessage] = useState('');
	const [userName, setUserName] = useState('');

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				const credStore = new XCredentialStore();
				await credStore.load();

				if (!credStore.isConfigured()) {
					setStatus('missing');
					setMessage(
						'X API 凭证未配置。请设置以下环境变量:\n\n' +
							'  X_API_KEY=<your_api_key>\n' +
							'  X_API_SECRET=<your_api_secret>\n' +
							'  X_BEARER_TOKEN=<your_bearer_token>\n' +
							'  X_ACCESS_TOKEN=<your_access_token>\n' +
							'  X_ACCESS_TOKEN_SECRET=<your_access_token_secret>\n\n' +
							'或将 .env 文件放在 ~/.config/x-cli/ 目录下\n' +
							'获取凭证: https://developer.x.com/en/portal/dashboard',
					);
					return;
				}

				// Validate credentials
				setMessage('正在验证凭证...');
				const api = new XApi(credStore);
				const resp = await api.getMyUser();
				setUserName(`${resp.data.name} (@${resp.data.username})`);
				setStatus('configured');
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

	if (status === 'error') {
		return (
			<ErrorDisplay message={message} suggestion="请检查 X API 凭证是否正确" />
		);
	}

	if (status === 'missing') {
		return (
			<Box flexDirection="column">
				<Text bold color="yellow">
					X API 配置
				</Text>
				<Box marginTop={1}>
					<Text>{message}</Text>
				</Box>
			</Box>
		);
	}

	if (status === 'configured') {
		return (
			<Box flexDirection="column">
				<Text bold color="green">
					✓ X API 已配置
				</Text>
				<Box marginLeft={2}>
					<Text>当前用户: {userName}</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box>
			<Spinner label="" />
			<Text> 正在检查 X API 配置...</Text>
		</Box>
	);
}
