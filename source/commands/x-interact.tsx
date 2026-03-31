import {Box, Text} from 'ink';
import {useState, useEffect} from 'react';
import {Spinner} from '@inkjs/ui';
import {XCredentialStore} from '../core/auth/x-auth';
import {XApi} from '../core/api/x-api';
import {useInkApp} from '../core/utils/ink-app';
import ErrorDisplay from '../components/error-display';
import InteractResult from '../components/interact-result';
import type {GlobalFlags} from './types';

type TwitterInteractType =
	| 'x-post'
	| 'x-reply'
	| 'x-quote'
	| 'x-delete'
	| 'x-like'
	| 'x-retweet';

type Props = {
	readonly interactType: TwitterInteractType;
	readonly target: string;
	readonly text?: string;
	readonly flags: GlobalFlags;
	readonly format?: 'human' | 'json';
};

export default function TwitterInteractCommand({
	interactType,
	target,
	text,
	flags: _flags,
	format = 'human',
}: Props) {
	const {exit} = useInkApp();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState(false);
	const [message, setMessage] = useState('');
	const [jsonOutput, setJsonOutput] = useState<string | undefined>();

	useEffect(() => {
		const run = async () => {
			try {
				const credStore = new XCredentialStore();
				await credStore.load();
				const api = new XApi(credStore);

				let resultData: unknown;

				switch (interactType) {
					case 'x-post': {
						if (!target) throw new Error('请提供推文内容');
						const resp = await api.postTweet(target);
						resultData = resp;
						setMessage(`推文已发送 (ID: ${resp.data.id})`);
						break;
					}

					case 'x-reply': {
						const tweetId = api.parseTweetId(target);
						if (!text) throw new Error('请提供回复内容');
						const resp = await api.replyToTweet(tweetId, text);
						resultData = resp;
						setMessage(`回复已发送 (ID: ${resp.data.id})`);
						break;
					}

					case 'x-quote': {
						const tweetId = api.parseTweetId(target);
						if (!text) throw new Error('请提供引用内容');
						const resp = await api.quoteTweet(tweetId, text);
						resultData = resp;
						setMessage(`引用推文已发送 (ID: ${resp.data.id})`);
						break;
					}

					case 'x-delete': {
						const tweetId = api.parseTweetId(target);
						await api.deleteTweet(tweetId);
						resultData = {deleted: true};
						setMessage(`推文 ${tweetId} 已删除`);
						break;
					}

					case 'x-like': {
						const tweetId = api.parseTweetId(target);
						await api.likeTweet(tweetId);
						resultData = {liked: true};
						setMessage(`已点赞推文 ${tweetId}`);
						break;
					}

					case 'x-retweet': {
						const tweetId = api.parseTweetId(target);
						await api.retweet(tweetId);
						resultData = {retweeted: true};
						setMessage(`已转推 ${tweetId}`);
						break;
					}

					default: {
						throw new Error('Unsupported X interact type');
					}
				}

				if (format === 'json') {
					setJsonOutput(JSON.stringify(resultData, null, 2));
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
	}, []);

	if (jsonOutput !== undefined) {
		return <Text>{jsonOutput}</Text>;
	}

	if (error) {
		return (
			<ErrorDisplay
				message={error}
				suggestion="请检查 X API 凭证和参数是否正确"
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
