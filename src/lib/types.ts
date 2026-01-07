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
	durationInFrames: number; // In composition frames (25 fps)
	BeginTime: string; // Format: "HH:MM:SS"
	EndTime: string; // Format: "HH:MM:SS"
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
