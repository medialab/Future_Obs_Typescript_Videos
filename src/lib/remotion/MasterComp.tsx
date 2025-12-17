import { AbsoluteFill, Sequence, Img, staticFile } from 'remotion';
import React from 'react';
import { SingleVideoComp } from './SingleVideoComp';
import type { VideoData } from '$lib/types';
import { springTiming, TransitionSeries } from '@remotion/transitions';

import { fade } from '@remotion/transitions/fade';

export type MasterCompositionProps = {
	segments: VideoData[];
};

export const MasterComposition: React.FC<MasterCompositionProps> = ({ segments }) => {
	if (segments.length === 0) {
		return null;
	}

	return (
		<AbsoluteFill>
			<TransitionSeries>
				{segments.map((segment, index) => (
					<React.Fragment key={`segment-wrap-${index}`}>
						<TransitionSeries.Sequence
							key={`segment-${index}`}
							durationInFrames={segment.durationInFrames}
						>
							<SingleVideoComp
								data={segment as VideoData}
								videoSrc={segment.videoSrc as string}
								duration={segment.durationInFrames as number}
								durationInFrames={segment.durationInFrames}
								isRendering={Boolean((segment as any).isRendering)}
							/>
						</TransitionSeries.Sequence>
						{index < segments.length - 1 && (
							<TransitionSeries.Transition
								presentation={fade()}
								timing={springTiming({ config: { damping: 200 } })}
							/>
						)}
					</React.Fragment>
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
