import {Box, Text} from 'ink';
import {Spinner} from '@inkjs/ui';

type Props = {
	readonly status:
		| 'loading'
		| 'waiting'
		| 'scanned'
		| 'confirmed'
		| 'expired'
		| 'error';
	readonly message?: string;
};

export default function QrCodeStatus({status, message}: Props) {
	switch (status) {
		case 'loading': {
			return (
				<Box>
					<Spinner label="" />
					<Text> 正在获取二维码...</Text>
				</Box>
			);
		}

		case 'waiting': {
			return (
				<Box flexDirection="column">
					{message && <Text>{message}</Text>}
					<Box marginTop={1}>
						<Spinner label="" />
						<Text> 等待扫描...</Text>
					</Box>
					<Text dimColor>请使用知乎 App 扫描上方二维码</Text>
				</Box>
			);
		}

		case 'scanned': {
			return (
				<Box>
					<Spinner label="" />
					<Text color="yellow"> 已扫描，请在手机上确认登录...</Text>
				</Box>
			);
		}

		case 'confirmed': {
			return (
				<Text bold color="green">
					✓ 登录成功！
				</Text>
			);
		}

		case 'expired': {
			return <Text color="red">✗ 二维码已过期，请重新运行 zget login</Text>;
		}

		case 'error': {
			return <Text color="red">✗ 登录失败{message ? `: ${message}` : ''}</Text>;
		}

		default: {
			return null;
		}
	}
}
