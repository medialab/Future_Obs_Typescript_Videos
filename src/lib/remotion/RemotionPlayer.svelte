<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createRoot, type Root } from 'react-dom/client';
	import { Player, type PlayerRef } from '@remotion/player';
	import { MasterComposition as MasterCompositionComponent } from '$lib/remotion/MasterComp';
	import React from 'react';
	import { currentFrame, timelineDurationInFrames } from '$lib/stores';
	import type { VideoData } from '$lib/types';

	// Must match INTRO_UNIQUE_DURATION * 3 in MasterComp.tsx
	const INTRO_DURATION_FRAMES = 240;
	const COMPOSITION_FPS = 25;

	let container: HTMLDivElement | null = $state(null);
	let root: Root | null = null;
	const playerRef = React.createRef<PlayerRef>();

	let props = $props<{
		segments: VideoData[];
	}>();

	$effect(() => {
		// Include intro duration in total timeline
		const segmentsDuration = props.segments.reduce((sum: number, seg: VideoData) => {
			return sum + seg.durationInFrames;
		}, 0);
		timelineDurationInFrames.set(INTRO_DURATION_FRAMES + segmentsDuration);
	});

	$effect(() => {
		if ($currentFrame && playerRef.current && container) {
			(playerRef.current as PlayerRef).pause();
			(playerRef.current as PlayerRef).seekTo($currentFrame);
		}
	});

	$effect(() => {
		if (container && $timelineDurationInFrames > 0) {
			if (root) {
				root.unmount();
			}

			root = createRoot(container); //we mount the player inside the container
			root.render(
				React.createElement(Player, {
					ref: playerRef as React.RefObject<PlayerRef>,
					component: MasterCompositionComponent as any,
					durationInFrames: $timelineDurationInFrames,
					compositionWidth: 1920,
					compositionHeight: 1080,
					fps: COMPOSITION_FPS,
					controls: true,
					clickToPlay: false,
					loop: false,
					autoPlay: false,
					inputProps: {
						segments: props.segments
					},
					style: {
						width: '100%',
						height: '100%'
					}
				})
			);
		}
	});

	$effect(() => {
		if (container) {
			if (playerRef.current) {
				playerRef.current.addEventListener('frameupdate', (e) => {
					$currentFrame = (playerRef.current as PlayerRef)?.getCurrentFrame();
				});
				playerRef.current.addEventListener('seeked', () => {
					$currentFrame = (playerRef.current as PlayerRef)?.getCurrentFrame();
				});
			}
		}
	});

	onDestroy(() => {
		if (root) {
			root.unmount();
		}
	});
</script>

{#if $timelineDurationInFrames > 0}
	<div
		class="remotion-player"
		bind:this={container}
		role="application"
		aria-label="Video player"
	></div>
{:else}
	<div class="remotion-player loading flex v centered">Loading video segments...</div>
{/if}

<style>
	.remotion-player {
		width: 100%;
		position: relative;
		z-index: 2;
		border: 1px dashed #c6c6c6;
		overflow: hidden;
		border-radius: 17px;
		background-color: #282828;
		/* Modern browsers with aspect-ratio support */
		aspect-ratio: 16/9;
		height: auto;
	}

	.loading {
		width: 100%;
	}

	/* Fallback for browsers that don't support aspect-ratio (Safari < 15.4) */
	@supports not (aspect-ratio: 16/9) {
		.remotion-player {
			height: 0;
			padding-bottom: 56.25%; /* 16/9 = 0.5625 */
		}

		/* svelte-ignore css_unused_selector - Used conditionally in @supports block */
		.remotion-player > * {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}
	}
</style>
