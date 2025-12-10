<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { createRoot, type Root } from 'react-dom/client';
import { Player, type PlayerRef } from '@remotion/player';
	import { MasterComposition as MasterCompositionComponent } from '$lib/remotion/MasterComp';
	import type { VideoData } from '$lib/remotion/SingleVideoComp';
import React from 'react';
import { currentFrame } from '$lib/stores';

	let container: HTMLDivElement | null = $state(null);
	let root: Root | null = null;
	const playerRef = React.createRef<PlayerRef>();
	

	let props = $props<{
		segments: VideoData[];
		controls: boolean;
		loop: boolean;
		autoPlay: boolean;
	}>();

	const calculateTotalDurationInFrames = (segments: VideoData[]): number => {
		return Math.ceil(segments.reduce((sum, seg) => sum + (seg.duration || 0), 0) * 30);
	};

	const isReady = $derived(
		props.segments.length > 0 &&
			props.segments.every((seg: VideoData) => seg.duration && seg.duration > 0)
	);

	const totalDurationInFrames = $derived(calculateTotalDurationInFrames(props.segments));

	$effect(() => {
		if ($currentFrame && playerRef.current && container) {
			(playerRef.current as PlayerRef).pause();
			(playerRef.current as PlayerRef).seekTo($currentFrame);
		}
	});

	$effect(() => {
		if (container && isReady && totalDurationInFrames > 0) {
			if (root) {
				root.unmount();
			}

			root = createRoot(container);
			root.render(
				React.createElement(Player, {
					ref: playerRef as React.RefObject<PlayerRef>,
					component: MasterCompositionComponent as any,
					durationInFrames: totalDurationInFrames as number,
					compositionWidth: 1920,
					compositionHeight: 1080,	
					fps: 30,
					controls: props.controls,
					clickToPlay: false,
					loop: props.loop,
					autoPlay: props.autoPlay,
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
					console.log('AAAAAAAA');
				});
				playerRef.current.addEventListener('seeked', () => {
					$currentFrame = (playerRef.current as PlayerRef)?.getCurrentFrame();
					console.log('AAAAAAAA');
				});
			}
		}
	})

	onDestroy(() => {
		if (root) {
			root.unmount();
		}
	});
</script>

{#if isReady}
	<div class="remotion-player" bind:this={container}
	onpointerdown={(e) => {
		e.stopPropagation();
		$currentFrame = (playerRef.current as PlayerRef)?.getCurrentFrame() || 0;
		console.log('current frame is ' + $currentFrame);
	}}
	onpointermove={(e) => {
		e.stopPropagation();
		$currentFrame = (playerRef.current as PlayerRef)?.getCurrentFrame() || 0;
		console.log('current frame is ' + $currentFrame);
	}}
	onpointerleave={(e) => {
		e.stopPropagation();
		$currentFrame = (playerRef.current as PlayerRef)?.getCurrentFrame() || 0;
		console.log('current frame is ' + $currentFrame);
	}}></div>
{:else}
	<div class="remotion-player loading">Loading video segments...</div>
{/if}

<style>
	.remotion-player {
		width: 100%;
		aspect-ratio: 16/9;
		height: auto;
		z-index: 2;
		border: 1px dashed #C6C6C6;
		overflow: hidden;
		border-radius: 17px;
		background-color: white;
	}
</style>
