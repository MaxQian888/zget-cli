import {describe, expect, it, vi} from 'vitest';
import {ZhihuApi} from '../../../source/core/api/zhihu-api';

describe('ZhihuApi', () => {
	it('adds same-origin detail headers for question and topic requests', async () => {
		const getJson = vi.fn().mockResolvedValue({});
		const api = new ZhihuApi({getJson} as never);

		await api.getQuestion('25499211');
		await api.getTopic('19550434');

		expect(getJson).toHaveBeenNthCalledWith(
			1,
			'https://www.zhihu.com/api/v4/questions/25499211',
			{
				include:
					'data[*].author,answer_count,follower_count,visit_count,comment_count,created_time,updated_time,detail,topics',
			},
			expect.objectContaining({
				'x-requested-with': 'fetch',
				'x-zse-93': '101_3_3.0',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-origin',
			}),
		);
		expect(getJson).toHaveBeenNthCalledWith(
			2,
			'https://www.zhihu.com/api/v4/topics/19550434',
			undefined,
			expect.objectContaining({
				'x-requested-with': 'fetch',
				'x-zse-93': '101_3_3.0',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-origin',
			}),
		);
	});
});
