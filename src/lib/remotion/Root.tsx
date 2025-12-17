//@ts-ignore
import { Composition, calculateMetadata } from 'remotion';
import { MasterComposition } from '$lib/remotion/MasterComp';
import type { MasterCompositionProps } from '$lib/remotion/MasterComp';
import React from 'react';
import type { CalculateMetadataFunction } from 'remotion';

const calculateMetadata: CalculateMetadataFunction<MasterCompositionProps> = ({ props }) => {
	const fps = 25;

	// Calculate total duration from segments (already in frames when provided)
	const durationInFrames = props.segments.reduce((sum, segment) => {
		if (typeof (segment as any).durationInFrames === 'number') {
			return sum + (segment as any).durationInFrames;
		}
		return sum + Math.ceil((segment.duration || 0) * (segment.fps ?? fps));
	}, 0);

	return {
		durationInFrames,
		props
	};
};

export const RemotionRoot: React.FC = () => (
	<Composition
		id="MasterComposition"
		component={MasterComposition}
		durationInFrames={3000} //this will be calculated after
		fps={25}
		width={1920}
		height={1080}
		defaultProps={{
			segments: []
		}}
		calculateMetadata={calculateMetadata}
	/>
);
