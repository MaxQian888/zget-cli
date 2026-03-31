export type DownloadResult = {
	success: boolean;
	title: string;
	author: string;
	outputPath: string;
	imageCount: number;
	error?: string;
};

export type DownloadProgress = {
	phase: 'fetching' | 'parsing' | 'images' | 'writing' | 'done' | 'error';
	message: string;
	current?: number;
	total?: number;
};

export type BatchItemStatus = 'pending' | 'completed' | 'failed';

export type BatchProgress = {
	completed: number;
	failed: number;
	total: number;
	currentItem?: string;
};

export type DownloadOptions = {
	outputDir: string;
	downloadImages: boolean;
	verbose: boolean;
	onProgress?: (progress: DownloadProgress) => void;
};
