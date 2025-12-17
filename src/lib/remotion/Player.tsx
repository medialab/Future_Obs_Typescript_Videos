import React from 'react';
import { Player } from '@remotion/player';
import { SingleVideoComp } from './SingleVideoComp';
import type { VideoData } from '../types';

export type RemotionPlayerProps = {
	videoData: VideoData;
	videoSrc: string;
	bgImg: string;
	timelineDurationInFrames: number;
	width?: number;
	height?: number;
	controls?: boolean;
	loop?: boolean;
	autoPlay?: boolean;
};

export const RemotionPlayer: React.FC<RemotionPlayerProps> = ({
	videoData,
	videoSrc,
	timelineDurationInFrames,
	width,
	height
}) => {
	return (
		<Player
			component={SingleVideoComp}
			durationInFrames={timelineDurationInFrames}
			compositionWidth={1920}
			compositionHeight={1080}
			fps={25}
			controls={true}
			loop={false}
			autoPlay={false}
			inputProps={{
				data: videoData,
				videoSrc,
				durationInFrames: timelineDurationInFrames
			}}
			style={{
				width,
				height
			}}
			acknowledgeRemotionLicense={true}
		/>
	);
};

export default RemotionPlayer;
