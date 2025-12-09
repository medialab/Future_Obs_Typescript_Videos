import { AbsoluteFill, Sequence, Img, staticFile } from 'remotion';
import React from 'react';
import { SingleVideoComp } from './SingleVideoComp';
import type { VideoData } from './SingleVideoComp';
import { linearTiming, springTiming, TransitionSeries } from '@remotion/transitions';

import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';

export type MasterCompositionProps = {
	segments: VideoData[];
};

export const MasterComposition: React.FC<MasterCompositionProps> = ({ segments }) => {
	let currentFrame = 0;
	const fps = 30;
	const segmentFrames = segments.map((segment) => {
		const startFrame = currentFrame;
		const durationFrames = Math.ceil((segment.duration as number) * fps);
		currentFrame += durationFrames;
		return {
			...segment,
			startFrame,
			durationFrames
		};
	});

	return (
		<AbsoluteFill>
			<TransitionSeries>
				{segmentFrames.map((segment, index) => (
					<>
						<TransitionSeries.Sequence
							key={`segment-${index}`}
							durationInFrames={Math.ceil((segment.duration as number) * fps)}
						>
							<SingleVideoComp
								data={segment as VideoData}
								videoSrc={segment.videoSrc as string}
								duration={segment.duration as number}
								isRendering={Boolean((segment as any).isRendering)}
							/>
						</TransitionSeries.Sequence>
						{index < segments.length - 1 && (
							<TransitionSeries.Transition
								presentation={fade()}
								timing={springTiming({ config: { damping: 200 } })}
							/>
						)}
					</>
				))}
			</TransitionSeries>

			<Img
				id="bg-image"
				src={staticFile('BACKGROUND.png')}
				style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
			/>
		</AbsoluteFill>
	);
};
