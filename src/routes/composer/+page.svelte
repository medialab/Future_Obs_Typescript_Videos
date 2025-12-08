<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import bgImg from '$lib/assets/BACKGROUND.png';
	import { renderedVideos } from '$lib/stores';
	import type { RenderedVideo } from '$lib/stores';

	import RemotionPlayer from '$lib/remotion/RemotionPlayer.svelte';

	import testCsv from '$lib/assets/test.csv?raw';
	import type { VideoData } from '$lib/remotion/Videocomp';

	import { csvToJson, triggerBlobDownload } from '$lib/utils';

	let videos = $state<any[]>([]);
	let isRendering = $state(false);
	let renderProgress = $state(0);
	let currentScene = $state(0);
	let renderStatus = $state('Ready to render');

	$inspect('renderStatus :', renderStatus);

	async function generateVideo(videos: VideoData[]) {
		return new Promise<Blob>((resolve, reject) => {
			fetch('/videos', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ videos })
			})
				.then(async (response) => {
					if (!response.ok) {
						throw new Error(`Failed to generate video: ${response.statusText}`);
					}

					const reader = response.body?.getReader();
					const decoder = new TextDecoder();

					if (!reader) {
						throw new Error('No response body');
					}

					let buffer = '';

					while (true) {
						const { done, value } = await reader.read();

						if (done) {
							reject(new Error('Stream ended without completion'));
							break;
						}

						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n\n');
						buffer = lines.pop() || '';

						for (const line of lines) {
							if (line.startsWith('data: ')) {
								try {
									const data = JSON.parse(line.slice(6));

									switch (data.type) {
										case 'status':
											renderStatus = data.data.message;
											console.log('Status:', data.data.message);
											break;

										case 'progress':
											const { renderedPercent, encodedPercent } = data.data;
											renderProgress = encodedPercent;
											renderStatus = `Rendering: ${renderedPercent}% rendered, ${encodedPercent}% encoded`;
											break;

										case 'complete':
											// Convert base64 to blob
											const binaryString = atob(data.data.video);
											const bytes = new Uint8Array(binaryString.length);
											for (let i = 0; i < binaryString.length; i++) {
												bytes[i] = binaryString.charCodeAt(i);
											}
											const blob = new Blob([bytes], { type: 'video/mp4' });
											resolve(blob);
											return;

										case 'error':
											reject(new Error(data.data.message));
											return;
									}
								} catch (e) {
									console.error('Error parsing message:', e, line);
								}
							}
						}
					}
				})
				.catch((e) => {
					console.error('Error processing stream:', e);
					reject(e);
				});
		});
	}

	onMount(async () => {
		if (!browser) return;

		const json = csvToJson(testCsv);
		videos = await addDurationToVideos(json.data);
		console.log('videos with duration', videos);
	});

	function parseTimeToSeconds(timeString: string): number {
		// Format: HH:MM:SS:FF (hours:minutes:seconds:frames or hundredths)
		const parts = timeString.split(':').map(Number);
		if (parts.length !== 4) {
			console.warn(`Invalid time format: ${timeString}`);
			return 0;
		}
		const [hours, minutes, seconds, frames] = parts;

		const totalSeconds = hours * 3600 + minutes * 60 + seconds + frames / 30;
		return totalSeconds;
	}

	async function addDurationToVideos(videos: any[]): Promise<VideoData[]> {
		return Promise.all(
			videos.map(async (video) => {
				// Generate videoSrc from ClipName before getting duration
				const videoSrc = `/videos/${video.ClipName}.mp4`;
				const duration = parseTimeToSeconds(video.EndTime) - parseTimeToSeconds(video.BeginTime);
				console.log('duration', duration);
				return {
					...video,
					videoSrc,
					duration
				};
			})
		);
	}

	async function renderAllVideos() {
		isRendering = true;
		renderedVideos.set([]);
		renderStatus = 'Starting...';

		try {
			const filename = `${videos.map((video) => video.ClipName).join(',')}.mp4`;
			const blob = await generateVideo(videos);
			renderedVideos.update((videos) => [...videos, { filename, blob }]);
			renderStatus = `Completed ${currentScene}/${videos.length}`;
		} catch (error) {
			console.error(`Error rendering videos:`, error);
			renderStatus = `Error rendering videos`;
		}
	}

	async function downloadRenderedVideo(video: RenderedVideo) {
		await triggerBlobDownload(video.blob, video.filename);
	}
</script>

{#key videos}
	<RemotionPlayer segments={videos} controls={true} loop={false} autoPlay={false} />
{/key}

<div class="controls">
	<button
		id="render-all-button"
		onclick={renderAllVideos}
		disabled={isRendering || videos.length === 0}
	>
		{isRendering ? 'Rendering (Server)...' : 'Render All (Server)'}
	</button>

	<progress id="render-progress" value={renderProgress} max="100">{renderProgress}%</progress>

	<p>Videos loaded: {videos.length}</p>

	{#if renderStatus}
		<p class="status">{renderStatus}</p>
	{/if}

	{#if $renderedVideos.length}
		<div class="rendered-list" id="rendered-list">
			<h3>Rendered videos</h3>
			{#each $renderedVideos as video, i}
				<div class="rendered-item">
					<span>{video.filename}</span>
					<button id={`video-download-button-${i}`} onclick={() => downloadRenderedVideo(video)}>
						Download
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background-color: white;
	}

	.controls {
		position: fixed;
		top: 20px;
		left: 20px;
		display: flex;
		flex-direction: row;
		gap: 10px;
		z-index: 100;
	}

	.rendered-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		z-index: 10;
	}

	.rendered-item {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.9rem;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
