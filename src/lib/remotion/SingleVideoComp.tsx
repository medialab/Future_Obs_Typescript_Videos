import { AbsoluteFill, Img, Sequence, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion';
import React from 'react';
import type { VideoData } from '$lib/types';
import { FadeOpacity, fadeAudioVolume } from './transitions';

// Local time parser - avoids SvelteKit imports that don't work in Remotion context
function parseTimeToSeconds(timeString: string): number {
	if (!timeString) return 0;
	const parts = timeString.split(':').map(Number);
	if (parts.length !== 3) {
		console.warn(`Invalid time format: ${timeString}. Expected HH:MM:SS`);
		return 0;
	}
	const [hours, minutes, seconds] = parts;
	return hours * 3600 + minutes * 60 + seconds;
}

export const SingleVideoComp: React.FC<{
	data: VideoData;
	videoSrc?: string;
	isRendering?: boolean;
}> = ({ data, videoSrc, isRendering }) => {
	const canvasHeight = 1080;
	const videoWidth = 1200;
	const videoHeight = videoWidth * (9 / 16) + 25;
	const videoTopOffset = 20;

	// IMPORTANT: trimBefore/trimAfter are in COMPOSITION frames, not source video frames
	// See: https://www.remotion.dev/docs/media/video#trimbefore
	const COMPOSITION_FPS = 25;

	// Calculate trim frames using COMPOSITION fps
	const beginTimeSeconds = data.BeginTime ? parseTimeToSeconds(data.BeginTime) : 0;
	const endTimeSeconds = data.EndTime ? parseTimeToSeconds(data.EndTime) : 0;
	const trimBeforeFrame = beginTimeSeconds * COMPOSITION_FPS;
	const trimAfterFrame = endTimeSeconds * COMPOSITION_FPS;

	// Clip duration in COMPOSITION frames (from data.durationInFrames, calculated at composition fps)
	// This is used for Sequence durations, fades, and timing within the composition
	const clipDurationFrames = data.durationInFrames;
	const frame = useCurrentFrame();

	if (!data) {
		return null;
	}

	let staticVideoSrc: string;
	const renderMode =
		typeof process !== 'undefined' && process.env?.REMOTION_RENDERING === 'true'
			? true
			: Boolean(isRendering || data.isRendering);

	if (renderMode) {
		staticVideoSrc = data.renderSrc || videoSrc || data.videoSrc || '';
	} else {
		const sourceVideoSrc = videoSrc || data.videoSrc;
		if (!sourceVideoSrc) {
			console.warn('No video source available in SingleVideoComp', { videoSrc, data });
			staticVideoSrc = '';
		} else {
			staticVideoSrc =
				sourceVideoSrc.startsWith('blob:') || sourceVideoSrc.startsWith('http')
					? sourceVideoSrc
					: sourceVideoSrc.startsWith('/')
						? sourceVideoSrc
						: `/${sourceVideoSrc}`;
		}
	}

	if (!staticVideoSrc) {
		console.error('No valid video source found for SingleVideoComp');
		return null;
	}

	const commentsArray = (data.Comments || '')
		.split('§')
		.map((c) => c.trim())
		.filter(Boolean);

	const Comment_authorsArray = (data.Comment_authors || '§ 0 commentaires')
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
					zIndex: -11,
					opacity: FadeOpacity(frame, 0, clipDurationFrames)
				}}
			>
				<OffthreadVideo
					src={staticVideoSrc}
					trimBefore={trimBeforeFrame}
					trimAfter={trimAfterFrame}
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					muted={!data.hasAudio}
					volume={data.hasAudio ? fadeAudioVolume(frame, 0, clipDurationFrames) : 0}
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
						zIndex: 3,
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
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
						zIndex: 3,
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
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
						alignSelf: 'center',
						lineHeight: 1.2,
						zIndex: 3,
						width: '90%',
						maxWidth: '80ch',
						whiteSpace: 'wrap',
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical' as const,
						lineClamp: 2,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						maxHeight: '2.4em',
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
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
						zIndex: 3,
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
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
					top: `${canvasHeight / 2 + videoHeight / 2 - 25}px`,
					width: 50,
					height: 'auto',
					zIndex: 3,
					opacity: FadeOpacity(frame, 0, clipDurationFrames)
				}}
			/>

			{Comment_authorsArray.map((author, i) => {
				const sequenceStart = i * singleCommentDuration;
				return (
					<Sequence
						key={`author-${i}`}
						from={sequenceStart}
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
								opacity: 0.5 * FadeOpacity(frame, sequenceStart, singleCommentDuration),
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
				);
			})}

			{commentsArray.map((comment, i) => {
				const sequenceStart = i * singleCommentDuration;
				return (
					<Sequence
						key={`comment-${i}`}
						from={sequenceStart}
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
								zIndex: 3,
								opacity: FadeOpacity(frame, sequenceStart, singleCommentDuration)
							}}
						>
							{comment}
						</div>
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};

function getPlatformIcon(platform: VideoData['Platform']): string {
	// Use staticFile() to reference files in the static folder
	if (platform === 'INSTAGRAM') {
		return staticFile('/INSTAGRAM.png');
	} else if (platform === 'FACEBOOK') {
		return staticFile('/FACEBOOK.png');
	} else if (platform === 'TIKTOK') {
		return staticFile('/TIKTOK.png');
	} else if (platform === 'LINKEDIN') {
		return staticFile('/LINKEDIN.png');
	} else {
		return staticFile('/YOUTUBE.png');
	}
}
