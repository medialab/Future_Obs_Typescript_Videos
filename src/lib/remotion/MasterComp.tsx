import { AbsoluteFill, Sequence, Img, staticFile, useCurrentFrame, interpolate } from 'remotion';
import React from 'react';
import { SingleVideoComp } from './SingleVideoComp';
import type { VideoData } from '$lib/types';
import { Audio } from '@remotion/media';

const INTRO_UNIQUE_DURATION = 80;

export type MasterCompositionProps = {
	segments: VideoData[];
};

export const MasterComposition: React.FC<MasterCompositionProps> = ({ segments }) => {
	const videoTitle = segments[0].originalVideoTitle;
	const frame = useCurrentFrame();

	// Helper function for audio fade in/out
	const getAudioVolume = (
		sequenceStartFrame: number,
		sequenceDuration: number,
		maxVolume: number = 0.2
	) => {
		const fadeFrames = 15; // Frames for audio fade in/out
		const sequenceFrame = frame - sequenceStartFrame;

		if (sequenceFrame < fadeFrames) {
			// Fade in
			return interpolate(sequenceFrame, [0, fadeFrames], [0, maxVolume], {
				extrapolateRight: 'clamp',
				easing: (t) => t * t * (3 - 2 * t) // Smooth cubic ease-in-out
			});
		} else if (sequenceFrame > sequenceDuration - fadeFrames) {
			// Fade out
			return interpolate(
				sequenceFrame,
				[sequenceDuration - fadeFrames, sequenceDuration],
				[maxVolume, 0],
				{
					extrapolateRight: 'clamp',
					easing: (t) => t * t * (3 - 2 * t) // Smooth cubic ease-in-out
				}
			);
		} else {
			// Full volume in middle
			return maxVolume;
		}
	};

	if (segments.length === 0) {
		return null;
	}

	return (
		<AbsoluteFill>
			<Sequence from={0} durationInFrames={INTRO_UNIQUE_DURATION * 3}>
				<Sequence from={0} durationInFrames={INTRO_UNIQUE_DURATION}>
					<div
						id="video_title"
						style={{
							position: 'absolute',
							top: '50%',
							left: '50%',
							transform: 'translate(-50%, -50%)',
							fontSize: 100,
							color: 'white',
							textAlign: 'center' as const,
							zIndex: 5,
							width: '100%',
							fontFamily: '"Rethink Sans", sans-serif'
						}}
					>
						{videoTitle}
					</div>
				</Sequence>

				<Sequence from={INTRO_UNIQUE_DURATION} durationInFrames={INTRO_UNIQUE_DURATION}>
					<Img
						id="platform-icon"
						src={staticFile('INTRO_1.png')}
						style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 3 }}
					/>
				</Sequence>

				<Sequence from={INTRO_UNIQUE_DURATION * 2} durationInFrames={INTRO_UNIQUE_DURATION}>
					<Img
						id="platform-icon"
						src={staticFile('INTRO_2.png')}
						style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 3 }}
					/>
				</Sequence>
				<AbsoluteFill style={{ backgroundColor: '#262626', zIndex: 2 }} />
				<Audio
					src={staticFile('INTRO_AUDIO.mp3')}
					volume={getAudioVolume(0, INTRO_UNIQUE_DURATION * 3, 0.2)}
				/>
			</Sequence>
			{segments.map((segment, index) => (
				<Sequence
					key={`segment-${index}`}
					from={
						INTRO_UNIQUE_DURATION * 3 +
						segments.slice(0, index).reduce((sum, seg) => sum + seg.durationInFrames, 0)
					}
					durationInFrames={segment.durationInFrames}
				>
					<SingleVideoComp
						data={segment as VideoData}
						videoSrc={segment.videoSrc as string}
						isRendering={Boolean((segment as any).isRendering)}
					/>
				</Sequence>
			))}

			<Img
				id="bg-image"
				src={staticFile('BACKGROUND.png')}
				style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
			/>
		</AbsoluteFill>
	);
};
