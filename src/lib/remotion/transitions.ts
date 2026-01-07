import { interpolate } from 'remotion';

export const fadeAudioVolume = (
	frame: number,
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

export const FadeOpacity = (
	frame: number,
	sequenceStartFrame: number,
	sequenceDuration: number
) => {
	const fadeFrames = 30; // Frames for fade in/out
	const sequenceFrame = frame - sequenceStartFrame;

	if (sequenceFrame < fadeFrames) {
		return interpolate(sequenceFrame, [0, fadeFrames], [0, 1], {
			extrapolateRight: 'clamp',
			easing: (t) => t * t * (3 - 2 * t) // Smooth cubic ease-in-out curve
		});
	} else if (sequenceFrame > sequenceDuration - fadeFrames) {
		return interpolate(sequenceFrame, [sequenceDuration - fadeFrames, sequenceDuration], [1, 0], {
			extrapolateRight: 'clamp',
			easing: (t) => t * t * (3 - 2 * t) // Smooth cubic ease-in-out curve
		});
	} else {
		return 1;
	}
};
