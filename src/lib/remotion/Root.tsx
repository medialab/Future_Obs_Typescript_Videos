//@ts-ignore
import { Composition, calculateMetadata } from 'remotion';
import { MasterComposition } from '$lib/remotion/MasterComp';
import type { MasterCompositionProps } from '$lib/remotion/MasterComp';
import React from 'react';
import type { CalculateMetadataFunction } from 'remotion';

const calculateMetadata: CalculateMetadataFunction<MasterCompositionProps> = ({ props }) => {
	const fps = 30;

	// Calculate total duration from segments
	const totalDuration = props.segments.reduce((sum, segment) => {
		return sum + (segment.duration || 0);
	}, 0);

	const durationInFrames = Math.ceil(totalDuration * fps);

	return {
		durationInFrames,
		props
	};
};

export const RemotionRoot: React.FC = () => (
	<Composition
		id="MasterComposition"
		component={MasterComposition}
		durationInFrames={3000} // Placeholder
		fps={30}
		width={1920}
		height={1080}
		defaultProps={{
			segments: []
		}}
		calculateMetadata={calculateMetadata}
	/>
);
