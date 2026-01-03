/**
 * CSR-Compatible Master Composition
 *
 * This is a client-side rendering compatible version of MasterComposition.
 * Key differences from SSR version:
 * - Uses direct URLs instead of staticFile() for images/audio
 * - Uses <Video> from @remotion/media instead of OffthreadVideo
 *
 * @see https://github.com/remotion-dev/remotion/issues/5913
 */

import { AbsoluteFill, Sequence, Img, useCurrentFrame } from 'remotion';
import { Video, Audio } from '@remotion/media';
import React from 'react';
import type { VideoData } from '$lib/types';

const INTRO_UNIQUE_DURATION = 80;

// Helper function for fade in/out opacity
function FadeOpacity(frame: number, startFrame: number, durationFrames: number): number {
	const fadeInDuration = 10;
	const fadeOutDuration = 10;
	const localFrame = frame - startFrame;

	if (localFrame < fadeInDuration) {
		return localFrame / fadeInDuration;
	}
	if (localFrame > durationFrames - fadeOutDuration) {
		return (durationFrames - localFrame) / fadeOutDuration;
	}
	return 1;
}

// Helper for audio fade
function fadeAudioVolume(
	frame: number,
	startFrame: number,
	durationFrames: number,
	maxVolume = 1
): number {
	const fadeInDuration = 15;
	const fadeOutDuration = 15;
	const localFrame = frame - startFrame;

	if (localFrame < fadeInDuration) {
		return (localFrame / fadeInDuration) * maxVolume;
	}
	if (localFrame > durationFrames - fadeOutDuration) {
		return ((durationFrames - localFrame) / fadeOutDuration) * maxVolume;
	}
	return maxVolume;
}

// Platform icon mapping using direct URLs
function getPlatformIcon(platform: VideoData['Platform']): string {
	const icons: Record<string, string> = {
		INSTAGRAM: '/INSTAGRAM.png',
		FACEBOOK: '/FACEBOOK.png',
		TIKTOK: '/TIKTOK.png',
		LINKEDIN: '/LINKEDIN.png',
		YOUTUBE: '/YOUTUBE.png'
	};
	return icons[platform] || '/YOUTUBE.png';
}

// CSR-compatible SingleVideoComp
const SingleVideoCompCSR: React.FC<{
	data: VideoData;
	videoSrc: string;
}> = ({ data, videoSrc }) => {
	const canvasHeight = 1080;
	const videoWidth = 1200;
	const videoHeight = videoWidth * (9 / 16) + 25;
	const videoTopOffset = 20;

	// Note: CSR doesn't support video trimming like SSR (no startFrom/endAt)
	// Videos play from beginning - trimming handled by Sequence duration
	const clipDurationFrames = data.durationInFrames;
	const frame = useCurrentFrame();

	if (!data || !videoSrc) {
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
		clipDurationFrames / Math.max(commentsArray.length, Comment_authorsArray.length, 1)
	);

	return (
		<AbsoluteFill style={{ fontFamily: '"Rethink Sans", sans-serif' }}>
			{/* Video container - using Video from @remotion/media for CSR */}
			<div
				id="video-container"
				style={{
					position: 'absolute',
					left: 15,
					top: `${(canvasHeight - videoHeight) / 2 + videoTopOffset}px`,
					width: videoWidth,
					height: videoHeight,
					overflow: 'hidden',
					zIndex: 5,
					opacity: FadeOpacity(frame, 0, clipDurationFrames)
				}}
			>
				<Video
					src={videoSrc}
					style={{ width: '100%', height: '100%', objectFit: 'cover' }}
					muted={!data.hasAudio}
					volume={data.hasAudio ? fadeAudioVolume(frame, 0, clipDurationFrames) : 0}
				/>
			</div>

			{/* Location text */}
			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					style={{
						position: 'absolute',
						left: 15,
						bottom: 15,
						fontSize: 30,
						color: 'black',
						textAlign: 'left',
						zIndex: 20,
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
					}}
				>
					{data.Location}
				</div>
			</Sequence>

			{/* Date text */}
			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					style={{
						position: 'absolute',
						right: 15,
						bottom: 15,
						fontSize: 30,
						color: 'black',
						textAlign: 'right',
						zIndex: 20,
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
					}}
				>
					{data.Date}
				</div>
			</Sequence>

			{/* Title text */}
			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					style={{
						position: 'absolute',
						left: '50%',
						top: 20,
						transform: 'translateX(-50%)',
						fontSize: 50,
						color: 'black',
						textAlign: 'center',
						alignSelf: 'center',
						lineHeight: 1.2,
						zIndex: 20,
						width: '90%',
						maxWidth: '80ch',
						whiteSpace: 'normal',
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						maxHeight: '2.4em',
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
					}}
				>
					{data.Title}
				</div>
			</Sequence>

			{/* Post author */}
			<Sequence from={0} durationInFrames={clipDurationFrames}>
				<div
					style={{
						position: 'absolute',
						left: 50,
						top: `${canvasHeight / 2 + videoHeight / 2 - 20}px`,
						fontSize: 30,
						color: 'black',
						textAlign: 'left',
						zIndex: 20,
						opacity: FadeOpacity(frame, 0, clipDurationFrames)
					}}
				>
					{data.Post_author}
				</div>
			</Sequence>

			{/* Platform icon - using direct URL */}
			<Img
				src={getPlatformIcon(data.Platform)}
				style={{
					position: 'absolute',
					left: `${videoWidth - 80}px`,
					top: `${canvasHeight / 2 + videoHeight / 2 - 25}px`,
					width: 50,
					height: 'auto',
					zIndex: 20,
					opacity: FadeOpacity(frame, 0, clipDurationFrames)
				}}
			/>

			{/* Comment authors */}
			{Comment_authorsArray.map((author, i) => {
				const sequenceStart = i * singleCommentDuration;
				return (
					<Sequence
						key={`author-${i}`}
						from={sequenceStart}
						durationInFrames={singleCommentDuration}
					>
						<div
							style={{
								position: 'absolute',
								left: `${20 + videoWidth}px`,
								top: `${canvasHeight / 3.5}px`,
								fontSize: 35,
								color: 'white',
								opacity: 0.5 * FadeOpacity(frame, sequenceStart, singleCommentDuration),
								maxWidth: '25ch',
								whiteSpace: 'normal',
								fontStyle: 'italic',
								textAlign: 'left',
								zIndex: 20
							}}
						>
							@{author}
						</div>
					</Sequence>
				);
			})}

			{/* Comments */}
			{commentsArray.map((comment, i) => {
				const sequenceStart = i * singleCommentDuration;
				return (
					<Sequence
						key={`comment-${i}`}
						from={sequenceStart}
						durationInFrames={singleCommentDuration}
					>
						<div
							style={{
								position: 'absolute',
								left: `${20 + videoWidth}px`,
								top: `${canvasHeight / 3.5 + 50}px`,
								fontSize: 40,
								color: 'white',
								textAlign: 'left',
								maxWidth: '25ch',
								whiteSpace: 'normal',
								lineHeight: 1.2,
								zIndex: 20,
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

export type MasterCompositionCSRProps = {
	segments: VideoData[];
};

/**
 * CSR-Compatible Master Composition
 * Uses direct URLs and @remotion/media Video component
 *
 * Z-INDEX STRUCTURE:
 * - Background image: z-index 1
 * - Video segments: z-index 10-20
 * - Intro dark bg: z-index 50
 * - Intro images: z-index 60
 * - Intro title: z-index 70
 */
export const MasterCompositionCSR: React.FC<MasterCompositionCSRProps> = ({ segments }) => {
	const videoTitle = segments[0]?.originalVideoTitle || 'Video';
	const frame = useCurrentFrame();

	if (segments.length === 0) {
		return null;
	}

	return (
		<AbsoluteFill style={{ position: 'relative' }}>
			{/* LAYER 1: Background image - lowest layer */}
			<AbsoluteFill style={{ zIndex: 1 }}>
				<Img src="/BACKGROUND.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
			</AbsoluteFill>

			{/* LAYER 2: Video segments - middle layer */}
			<AbsoluteFill style={{ zIndex: 10 }}>
				{segments.map((segment, index) => (
					<Sequence
						key={`segment-${index}`}
						from={
							INTRO_UNIQUE_DURATION * 3 +
							segments.slice(0, index).reduce((sum, seg) => sum + seg.durationInFrames, 0)
						}
						durationInFrames={segment.durationInFrames}
					>
						<SingleVideoCompCSR
							data={segment}
							videoSrc={segment.renderSrc || segment.videoSrc || ''}
						/>
					</Sequence>
				))}
			</AbsoluteFill>

			{/* LAYER 3: Intro sequence - top layer (only visible during intro) */}
			<Sequence from={0} durationInFrames={INTRO_UNIQUE_DURATION * 3}>
				<AbsoluteFill style={{ zIndex: 50 }}>
					{/* Dark background for intro */}
					<AbsoluteFill style={{ backgroundColor: '#262626' }} />

					{/* Title card */}
					<Sequence from={0} durationInFrames={INTRO_UNIQUE_DURATION}>
						<AbsoluteFill
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								zIndex: 70
							}}
						>
							<div
								style={{
									fontSize: 60,
									color: 'white',
									textAlign: 'center',
									width: '100%',
									fontFamily: '"Rethink Sans", sans-serif'
								}}
							>
								{videoTitle}
							</div>
						</AbsoluteFill>
					</Sequence>

					{/* Intro image 1 */}
					<Sequence from={INTRO_UNIQUE_DURATION} durationInFrames={INTRO_UNIQUE_DURATION}>
						<AbsoluteFill style={{ zIndex: 60 }}>
							<Img
								src="/INTRO_1.png"
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</AbsoluteFill>
					</Sequence>

					{/* Intro image 2 */}
					<Sequence from={INTRO_UNIQUE_DURATION * 2} durationInFrames={INTRO_UNIQUE_DURATION}>
						<AbsoluteFill style={{ zIndex: 60 }}>
							<Img
								src="/INTRO_2.png"
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</AbsoluteFill>
					</Sequence>

					{/* Intro audio */}
					<Audio
						src="/INTRO_AUDIO.mp3"
						volume={fadeAudioVolume(frame, 0, INTRO_UNIQUE_DURATION * 3, 0.2)}
					/>
				</AbsoluteFill>
			</Sequence>
		</AbsoluteFill>
	);
};
