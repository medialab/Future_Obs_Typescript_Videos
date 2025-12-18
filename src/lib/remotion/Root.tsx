//@ts-ignore
import { Composition, calculateMetadata } from 'remotion';
import { MasterComposition } from '$lib/remotion/MasterComp';
import type { MasterCompositionProps } from '$lib/remotion/MasterComp';
import React from 'react';
import type { CalculateMetadataFunction } from 'remotion';

const calculateMetadata: CalculateMetadataFunction<MasterCompositionProps> = ({ props }) => {
	const durationInFrames = props.segments.reduce((sum, segment) => {
		const frames =
			typeof (segment as any).durationInFrames === 'number'
				? (segment as any).durationInFrames
				: typeof (segment as any).BeginFrame === 'number' &&
					  typeof (segment as any).EndFrame === 'number'
					? Math.max(0, (segment as any).EndFrame - (segment as any).BeginFrame)
					: 0;

		return sum + Math.round(frames);
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
