import { AbsoluteFill, Img, Sequence, OffthreadVideo, staticFile } from 'remotion';
import React from 'react';

export type VideoData = {
	Title?: string;
	Date?: string;
	Location?: string;
	Comment_authors?: string;
	Comments?: string;
	Post_author?: string;
	Platform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'OTHER';
	duration?: number;
	ClipName?: string;
	videoSrc?: string;
	videoSrcPath?: string;
	renderSrc?: string;
	isRendering?: boolean;
};

export const SingleVideoComp: React.FC<{
	data: VideoData;
	videoSrc: string;
	duration: number;
	isRendering?: boolean;
}> = ({ data, videoSrc, duration, isRendering }) => {
	const canvasWidth = 1920;
	const canvasHeight = 1080;
	const videoWidth = 1200;
	const videoHeight = videoWidth * (9 / 16) + 25;
	const videoTopOffset = 20;

	const clipDurationFrames = Math.ceil(duration * 30);

	if (!data) {
		return null;
	}

	// For server-side rendering, use absolute file path from videoSrcPath
	// For client-side, use HTTP URL
	let staticVideoSrc: string;
	const renderMode =
		typeof process !== 'undefined' && process.env?.REMOTION_RENDERING === 'true'
			? true
			: Boolean(isRendering || data.isRendering);

	if (renderMode) {
		// Renderer path: prefer explicit renderSrc (http/https), fallback to provided videoSrc
		staticVideoSrc = data.renderSrc || videoSrc;
	} else {
		// Client-side preview: use blob/http/relative paths
		staticVideoSrc = videoSrc.startsWith('blob:') || videoSrc.startsWith('http')
			? videoSrc
			: videoSrc.startsWith('/')
				? videoSrc
				: `/${videoSrc}`;
	}

	const commentsArray = (data.Comments || '§ Comment manquant')
		.split('§')
		.map((c) => c.trim())
		.filter(Boolean);

	const Comment_authorsArray = (data.Comment_authors || '§ Author manquant')
		.split('§')
		.map((c) => c.trim())
		.filter(Boolean);

	const singleCommentDuration = Math.floor(
		clipDurationFrames / Math.max(commentsArray.length, Comment_authorsArray.length)
	);

	return (
		<AbsoluteFill style={{ fontFamily: '"Rethink Sans", sans-serif' }}>
			<div
				id="video-container"
				style={{
					position: 'absolute',
					left: 15,
					top: `${(canvasHeight - videoHeight) / 2 + videoTopOffset}px`,
					width: videoWidth,
					height: videoHeight,
					overflow: 'hidden',
					zIndex: -11
				}}
			>
				<OffthreadVideo
					src={staticVideoSrc}
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					muted={false}
				/>
			</div>

			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					id="location-text"
					style={{
						position: 'absolute',
						left: 15,
						bottom: 15,
						fontSize: 30,
						color: 'black',
						textAlign: 'left' as const,
						zIndex: 3
					}}
				>
					{data.Location}
				</div>
			</Sequence>

			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					id="date-text"
					style={{
						position: 'absolute',
						right: 15,
						bottom: 15,
						fontSize: 30,
						color: 'black',
						textAlign: 'right' as const,
						zIndex: 3
					}}
				>
					{data.Date}
				</div>
			</Sequence>

			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					id="title-text"
					style={{
						position: 'absolute',
						left: '50%',
						top: 20,
						transform: 'translateX(-50%)',
						fontSize: 50,
						color: 'black',
						textAlign: 'center' as const,
						lineHeight: 1.2,
						zIndex: 3,
						width: '90%',
						maxWidth: '80ch',
						whiteSpace: 'wrap',
						display: '-webkit-box',
						lineClamp: 2,
						overflow: 'hidden',
						textOverflow: 'ellipsis'
					}}
				>
					{data.Title}
				</div>
			</Sequence>

			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					id="post-author-text"
					style={{
						position: 'absolute',
						left: 50,
						top: `${canvasHeight / 2 + videoHeight / 2 - 20}px`,
						fontSize: 30,
						color: 'black',
						textAlign: 'left' as const,
						zIndex: 3
					}}
				>
					{data.Post_author}
				</div>
			</Sequence>

			<Img
				id="platform-icon"
				src={getPlatformIcon(data.Platform)}
				style={{
					position: 'absolute',
					left: `${videoWidth - 80}px`,
					top: `${canvasHeight / 2 + videoHeight / 2 - 18}px`,
					width: 50,
					height: 'auto',
					zIndex: 3
				}}
			/>

			{Comment_authorsArray.map((author, i) => (
				<Sequence
					key={`author-${i}`}
					from={i * singleCommentDuration}
					durationInFrames={singleCommentDuration}
				>
					<div
						id="comment-author-text"
						style={{
							position: 'absolute',
							left: `${20 + videoWidth}px`,
							top: `${canvasHeight / 3.5}px`,
							fontSize: 35,
							color: 'white',
							opacity: 0.5,
							maxWidth: '25ch',
							whiteSpace: 'wrap',
							fontStyle: 'italic',
							textAlign: 'left' as const,
							zIndex: 3
						}}
					>
						@{author}
					</div>
				</Sequence>
			))}

			{commentsArray.map((comment, i) => (
				<Sequence
					key={`comment-${i}`}
					from={i * singleCommentDuration}
					durationInFrames={singleCommentDuration}
				>
					<div
						id="comment-text"
						style={{
							position: 'absolute',
							left: `${20 + videoWidth}px`,
							top: `${canvasHeight / 3.5 + 50}px`,
							fontSize: 40,
							color: 'white',
							textAlign: 'left' as const,
							maxWidth: '25ch',
							whiteSpace: 'wrap',
							lineHeight: 1.2,
							zIndex: 3
						}}
					>
						{comment}
					</div>
				</Sequence>
			))}
		</AbsoluteFill>
	);
};

function getPlatformIcon(platform: VideoData['Platform']): string {
	// Use staticFile() to reference files in the static folder
	if (platform === 'INSTAGRAM') {
		return staticFile('/InstaIcon.svg');
	} else if (platform === 'FACEBOOK') {
		return staticFile('/FacebookIcon.png');
	} else {
		return staticFile('/YoutubeIcon.png');
	}
}
