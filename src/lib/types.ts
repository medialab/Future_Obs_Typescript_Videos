export type VideoData = {
	ClipName: string;
	Title: string;
	Date: string;
	Location: string;
	Comment_authors?: string;
	Comments?: string;
	Post_author: string;
	Platform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'OTHER';
	videoSrc: string;
	videoSrcPath: string;
	renderSrc: string;
	isRendering: boolean;
	durationInFrames: number;
	BeginTime: string;
	BeginFrame?: number;
	EndTime: string;
	EndFrame?: number;
	fps?: number;
	originalVideoTitle: string;
	loudness?: number;
	hasAudio?: boolean;
};

export type RenderedVideo = {
	filename: string;
	blob: Blob | undefined;
};

export type RenderVideoData = VideoData & {
	videoSrcPath?: string;
	renderSrc?: string;
	isRendering?: boolean;
};
