import {Box, Text} from 'ink';
import {useState} from 'react';
import {Spinner} from '@inkjs/ui';
import {useRunOnceEffect} from '../core/utils/run-once-effect';
import {BiliCookieStore} from '../core/auth/bili-auth';
import {BiliApi} from '../core/api/bili-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import InteractResult from '../components/interact-result';
import type {GlobalFlags} from './types';

type BiliInteractType = 'bili-like' | 'bili-coin' | 'bili-triple';

type Props = {
	readonly interactType: BiliInteractType;
	readonly target: string;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function BiliInteractCommand({
	interactType,
	target,
	flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [message, setMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useRunOnceEffect(() => {
		const run = async () => {
			try {
				const cookieStore = new BiliCookieStore();
				await cookieStore.load();
				if (flags.cookies) cookieStore.parseCookieString(flags.cookies);

				const api = new BiliApi(cookieStore);

				switch (interactType) {
					case 'bili-like': {
						await api.likeVideo(target);
						setMessage(`已点赞视频 ${target}`);
						break;
					}

					case 'bili-coin': {
						await api.coinVideo(target);
						setMessage(`已投币视频 ${target}`);
						break;
					}

					case 'bili-triple': {
						await api.tripleVideo(target);
						setMessage(`已一键三连视频 ${target}`);
						break;
					}

					default: {
						throw new Error('Unsupported Bilibili interact type');
					}
				}

				if (format === 'json') {
					setJsonOutput(
						JSON.stringify(
							{success: true, action: interactType, target},
							null,
							2,
						),
					);
				}

				setSuccess(true);
				setLoading(false);
			} catch (error_: unknown) {
				setError(error_ instanceof Error ? error_.message : String(error_));
				setLoading(false);
			} finally {
				setTimeout(() => {
					exit();
				}, 100);
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
				suggestion='请运行 "zget bili login" 登录后重试'
			/>
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

	return <InteractResult isSuccess={success} message={message} />;
}
