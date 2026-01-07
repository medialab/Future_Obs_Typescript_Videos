//@ts-ignore
import { Composition, calculateMetadata } from 'remotion';
import { MasterComposition } from '$lib/remotion/MasterComp';
import type { MasterCompositionProps } from '$lib/remotion/MasterComp';
import React from 'react';
import type { CalculateMetadataFunction } from 'remotion';

// Must match INTRO_UNIQUE_DURATION * 3 in MasterComp.tsx
const INTRO_DURATION_FRAMES = 240;

const calculateMetadata: CalculateMetadataFunction<MasterCompositionProps> = ({ props }) => {
	const segmentsDuration = props.segments.reduce((sum, segment) => {
		const frames =
			typeof (segment as any).durationInFrames === 'number' ? (segment as any).durationInFrames : 0;

		return sum + Math.round(frames);
	}, 0);

	return {
		durationInFrames: INTRO_DURATION_FRAMES + segmentsDuration,
		props
	};
};

export const RemotionRoot: React.FC = () => (
	<Composition
		id="MasterComposition"
		component={MasterComposition}
		durationInFrames={3000}
		fps={25}
		width={1920}
		height={1080}
		defaultProps={{
			segments: []
		}}
		calculateMetadata={calculateMetadata}
	/>
);
