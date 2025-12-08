import React from 'react';
import { Player } from '@remotion/player';
import { SingleVideoComp } from './SingleVideoComp';
import type { VideoData } from './SingleVideoComp';

export type RemotionPlayerProps = {
	videoData: VideoData;
	videoSrc: string;
	bgImg: string;
	duration: number;
	width?: number;
	height?: number;
	controls?: boolean;
	loop?: boolean;
	autoPlay?: boolean;
};

export const RemotionPlayer: React.FC<RemotionPlayerProps> = ({
	videoData,
	videoSrc,
	bgImg,
	duration,
	width,
	height,
	controls = true,
	loop = false,
	autoPlay = false
}) => {
	// Calculate duration in frames (30 fps)
	const durationInFrames = Math.ceil(duration * 30);

	return (
		<Player
			component={SingleVideoComp}
			durationInFrames={durationInFrames}
			compositionWidth={1920}
			compositionHeight={1080}
			fps={30}
			controls={controls}
			loop={loop}
			autoPlay={autoPlay}
			inputProps={{
				data: videoData,
				videoSrc,
				bgImg,
				duration
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
