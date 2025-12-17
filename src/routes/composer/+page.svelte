<script lang="ts">
	import pendingIcon from '$lib/assets/icons/renderable.svg';
	import renderingIcon from '$lib/assets/icons/inrender.svg';
	import successIcon from '$lib/assets/icons/success.svg';
	import errorIcon from '$lib/assets/icons/error.svg';
	import trashIcon from '$lib/assets/icons/trash.svg';

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// Stores
	import {
		renderedVideo,
		uploadedVideoFiles,
		uploadedCsvFile,
		timelineDurationInFrames,
		currentFrame
	} from '$lib/stores';

	// Components
	import Header from '$lib/components/header.svelte';
	import RemotionPlayer from '$lib/remotion/RemotionPlayer.svelte';

	// Utilities
	import { parseTimeToSeconds, triggerBlobDownload } from '$lib/utils';
	import { parseMedia } from '@remotion/media-parser';
	import { csvToJson } from '$lib/tableUtils';
	import { storeRenderedVideo, clearFile, loadRenderedVideo } from '$lib/fileStorage';

	// Types
	import type { VideoData, RenderVideoData, RenderedVideo } from '$lib/types';

	let finalVideoDataset = $state<any[]>([]);
	let chipStatus = $state<'pending' | 'rendering' | 'success' | 'error'>('pending');
	let isRendering = $state(false);
	let renderProgress = $state(0);
	let renderStatus = $state('Ready to render');

	$effect(() => {
		const duration = $timelineDurationInFrames;
		if (duration > 0) {
			const progressFraction = renderProgress / 100;
			const newFrame = Math.round(progressFraction * duration);
			currentFrame.set(newFrame);
		} else {
			currentFrame.set(0);
		}
	});

	$inspect('Render status :', renderStatus);

	async function generateVideo(videos: RenderVideoData[]) {
		return new Promise<Blob>((resolve, reject) => {
			fetch('/composer/api/videos', {
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
											renderProgress = (renderedPercent + encodedPercent) / 2;
											renderStatus = `Rendering: ${renderedPercent}% rendered, ${encodedPercent}% encoded`;
											break;

										case 'complete':
											const downloadUrl = data.data.downloadUrl;

											try {
												const fileResponse = await fetch(downloadUrl);

												if (!fileResponse.ok) {
													reject(new Error(`Failed to download video: ${fileResponse.statusText}`));
													return;
												}

												const blob = await fileResponse.blob();
												resolve(blob);
												return;
											} catch (fetchError) {
												reject(
													new Error(
														`Error downloading video: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
													)
												);
												return;
											}

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

	async function uploadVideosForRendering(videos: VideoData[]): Promise<RenderVideoData[]> {
		const formData = new FormData();

		formData.append('videos', JSON.stringify(videos));

		for (const video of videos) {
			const clipName = (video as any).ClipName?.trim();
			if (!clipName) {
				console.warn('Video missing ClipName, skipping:', video);
				continue;
			}

			const matchingFile: File | undefined = $uploadedVideoFiles.find(
				(f) => f.name.replace(/\.(mp4|mov|avi|mkv)$/i, '') === clipName
			);

			if (matchingFile) {
				const blobLike = matchingFile as File | Blob;
				const fileToSend =
					blobLike instanceof File
						? blobLike
						: new File([blobLike], (blobLike as any).name ?? `${clipName}.mp4`, {
								type: (blobLike as any).type ?? 'video/mp4',
								lastModified: (blobLike as any).lastModified ?? Date.now()
							});

				formData.append('files', fileToSend);
			} else {
				console.warn(`No matching file found for ClipName: ${clipName}`);
			}
		}

		const response = await fetch('/composer/api/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to upload videos: ${response.statusText} - ${errorText}`);
		}

		const { videos: updatedVideos } = await response.json();
		console.log('Uploaded videos:', videos);
		return updatedVideos as RenderVideoData[];
	}

	$effect(() => {
		//We update the final dataset reactively
		if (!browser) return;

		if (!$uploadedCsvFile || !$uploadedVideoFiles || $uploadedVideoFiles.length === 0) {
			return;
		}

		(async () => {
			try {
				const json = await csvToJson($uploadedCsvFile);

				if (json.data && Array.isArray(json.data)) {
					if ($uploadedVideoFiles && $uploadedVideoFiles.length > 0) {
						json.data = json.data.map((row: any) => {
							const clipName = row.ClipName?.trim();

							if (clipName) {
								const matchingFile = $uploadedVideoFiles.find(
									(f) => f.name.replace('.mp4', '').replace('.mov', '') === clipName
								);

								if (matchingFile) {
									row.videoSrc = URL.createObjectURL(matchingFile);
								}
							}

							return row;
						});
					}
				} else {
					throw console.error(400, 'We encountered an error parsing the CSV file');
				}

				const f: VideoData[] = await amplifyVideoData(json.data);

				finalVideoDataset = f; //Here we consolidate the final dataset we use

				console.log('Final video dataset:', finalVideoDataset);
			} catch (error) {
				console.error('Error loading videos:', error);
			}
		})();
	});

	async function amplifyVideoData(data: any[]): Promise<VideoData[]> {
		return Promise.all(
			data.map(async (video) => {
				const videoSrc = video.videoSrc;

				const metadata = await parseMedia({
					src: videoSrc,
					fields: { fps: true, dimensions: true }
				});

				if (!metadata.fps) {
					throw console.error('FPS not found for video: ', video.ClipName);
				}

				return {
					...video,
					videoSrc,
					durationInFrames: Math.ceil(
						(parseTimeToSeconds(video.EndTime) - parseTimeToSeconds(video.BeginTime)) * metadata.fps
					),
					BeginTime: video.BeginTime,
					EndTime: video.EndTime,
					fps: metadata.fps,
					BeginFrame: parseTimeToSeconds(video.BeginTime) * metadata.fps,
					EndFrame: parseTimeToSeconds(video.EndTime) * metadata.fps
				}; //Here we actually amplify the videodata
			})
		);
	}

	async function renderAllVideos() {
		isRendering = true;
		renderedVideo.set([{ filename: '', blob: undefined }]);
		renderStatus = 'Uploading videos...';
		chipStatus = 'rendering';
		try {
			renderStatus = 'Uploading videos to server...';
			const videosWithServerPaths = await uploadVideosForRendering(finalVideoDataset);
			console.log('Videos uploaded, server paths:', videosWithServerPaths);

			const assetOrigin =
				typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

			const renderReadyVideos = videosWithServerPaths.map((video) => {
				const normalized = video.videoSrc?.startsWith('/')
					? `${assetOrigin}${video.videoSrc}`
					: video.videoSrc
						? `${assetOrigin}/${video.videoSrc}`
						: video.renderSrc;

				return {
					...video,
					renderSrc: video.renderSrc || normalized,
					isRendering: true
				};
			});

			// Step 2: Generate video using the videos with server paths
			renderStatus = 'Starting render...';
			const filename = `master-video.mp4`;
			const blob = await generateVideo(renderReadyVideos);

			renderedVideo.set([{ filename, blob }]);
			renderStatus = 'Completed';
			chipStatus = 'success';
			isRendering = false;

			try {
				await storeRenderedVideo({ filename, blob });
				console.log('storedVideo :', { filename, blob });
			} catch (error) {
				console.error('Error storing rendered video:', error);
			}
		} catch (error) {
			console.error(`Error rendering videos:`, error);
			renderStatus = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			isRendering = false;
			chipStatus = 'error';
		}
	}

	async function downloadRenderedVideo(video: RenderedVideo) {
		if (!video.blob) {
			console.error('ERROR: Blob is empty!');
			return;
		}
		if (!video.filename) {
			console.error('ERROR: Filename is empty!');
			return;
		}

		await triggerBlobDownload(video.blob, video.filename);
	}

	onMount(async () => {
		const storedVideo = await loadRenderedVideo();
		console.log('storedVideo :', storedVideo);
		if (storedVideo) {
			renderedVideo.set([storedVideo]);
			chipStatus = 'success';
		}
	});

	onDestroy(() => {
		finalVideoDataset.forEach((video: any) => {
			if (video.videoSrc?.startsWith('blob:')) {
				URL.revokeObjectURL(video.videoSrc);
			}
		});
	});
</script>

<Header type="composer" />

{#snippet timelinePill(video: VideoData, totaleTimelineWidth: number, index: number = 0)}
	{@const startFrame = finalVideoDataset
		.slice(0, index)
		.reduce(
			(sum, v) =>
				sum +
				(typeof (v as any).durationInFrames === 'number'
					? (v as any).durationInFrames
					: (v.duration || 0) * ((v as any).fps ?? 25)),
			0
		)}
	{@const endFrame =
		startFrame +
		((typeof (video as any)?.durationInFrames === 'number'
			? (video as any).durationInFrames
			: (video?.durationInFrames || 0) * ((video as any)?.fps ?? 25)) as number)}
	{@const isActive = $currentFrame >= startFrame && $currentFrame < endFrame}
	<button
		class="container flex v minigap centered"
		class:success={isActive}
		style="width: {(video as any)?.durationInFrames
			? ((video as any).durationInFrames / totaleTimelineWidth) * 100 + '%'
			: video?.durationInFrames
				? ((video.durationInFrames * ((video as any).fps ?? 25)) / totaleTimelineWidth) * 100 + '%'
				: '0px'};"
		onclick={() => {
			$currentFrame = startFrame + 1; //The one is perceptual for the first segment
		}}
	>
		<p class="microtitle pilltext">{(video as any)?.ClipName || 'Video_1.mp4'}</p></button
	>

	<style>
		.container {
			height: fit-content;
			width: 100%;
			border-radius: 50px;
			border: 1px solid #6b74c4;
			background-color: #c6ccff;
			transition: background-color 0.2s ease;
		}

		.pilltext {
			overflow-x: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			width: 100%;
		}
	</style>
{/snippet}

<section class="main_grid">
	<div class="flex v" id="videofiles_infos">
		<div class="flex v mediumgap">
			<p class="title">Video options</p>
			<div class="flex v mediumgap">
				<div class="flex v minigap">
					<p class="microtitle">Render quality:</p>
					<p class="annotation">HD</p>
				</div>
				<div class="flex v minigap">
					<p class="microtitle">Framerate:</p>
					<p class="annotation">24fps</p>
				</div>
				<div class="flex v minigap">
					<p class="microtitle">Audio normalization:</p>
					<p class="annotation">Yes</p>
				</div>
			</div>
		</div>
		<div class="flex v mediumgap">
			<p class="title">File inspections</p>
			<div class="flex v mediumgap">
				<div class="flex v minigap">
					<p class="microtitle">Codec:</p>
					<p class="annotation">Mpeg4</p>
				</div>
				<div class="flex v minigap">
					<p class="microtitle">Canvas:</p>
					<p class="annotation">1920x1080</p>
				</div>
				<div class="flex v minigap">
					<p class="microtitle">Weight:</p>
					<p class="annotation">322mb</p>
				</div>
			</div>
		</div>
	</div>
	<div class="player_console flex v" id="remotion_player_container">
		<div class="flex h spacebetween" style="padding: 0 5px;">
			<p class="annotation">
				{$uploadedCsvFile?.name.trim().split('.')[0]}
			</p>
		</div>
		{#key finalVideoDataset && $uploadedVideoFiles && $uploadedCsvFile}
			<RemotionPlayer segments={finalVideoDataset} controls={true} loop={false} autoPlay={false} />
		{/key}
		<div class="timeline flex h minigap">
			{#each finalVideoDataset as v, index}
				{@render timelinePill(v, $timelineDurationInFrames, index)}
			{/each}
		</div>
	</div>
	<div class="flex v mediumgap" id="alert_container" style="overflow: hidden;">
		<p class="title">Render status</p>
		<div class="flex v minigap">
			{@render renderChip(
				chipStatus,
				$renderedVideo[0].filename,
				$renderedVideo[0].blob?.size || 0
			)}
		</div>
	</div>
</section>

{#snippet renderChip(
	state: 'pending' | 'rendering' | 'success' | 'error' = 'pending',
	filename: string,
	size: number
)}
	<div class="chip_father flex v minigap centered">
		{#if state !== 'pending'}
			<div
				class="absolute_dot"
				class:warning={state === 'rendering'}
				class:success={state === 'success'}
				class:error={state === 'error'}
			></div>
		{/if}
		<div class="chip flex h centered mediumgap">
			<button
				class="chip_img flex centered"
				onclick={state === 'pending'
					? () => {
							renderAllVideos();
						}
					: state === 'success'
						? () => {
								downloadRenderedVideo($renderedVideo[0]);
							}
						: () => {}}
				class:pending={state === 'pending'}
				class:warning={state === 'rendering'}
				class:success={state === 'success'}
				class:error={state === 'error'}
			>
				<img
					src={state === 'pending'
						? pendingIcon
						: state === 'rendering'
							? renderingIcon
							: state === 'success'
								? successIcon
								: errorIcon}
					alt={state}
				/>
			</button>

			<div class="flex v minigap">
				<p class="annotation">{filename || 'Your render video name'}</p>
				<p class="microtitle">{size + ' MB' || '0 MB For now'}</p>
			</div>

			{#if state === 'success'}
				<button
					class="trash_btn flex centered"
					onclick={async () =>
						await clearFile(filename).then(() => {
							chipStatus = 'pending';
							renderProgress = 0;
						})}
				>
					<img src={trashIcon} alt="trash" />
				</button>
			{/if}
		</div>
		<progress
			id="render-progress"
			class="render_progress"
			class:success={state === 'success'}
			value={renderProgress}
			max="100"
		></progress>
	</div>
	<style>
		.chip {
			width: fit-content;
			height: fit-content;
			border: 1px solid #d6d6d6;
			background-color: #fff;
			padding: 5px 5px 5px 5px;
			border-radius: 15px;
			position: relative;
			overflow: visible;
		}

		.chip_father {
			width: fit-content;
			height: fit-content;
			position: relative;
		}

		.absolute_dot {
			top: 0;
			right: 0;
			width: 15px;
			height: 15px;
			border-radius: 100%;
			position: absolute;
			transform: translate(30%, -30%);
			z-index: 10;
		}

		.render_progress {
			width: 95%;
			height: 10px;
			border-radius: 50px;
			background-color: #f2f2f2;
			border: 1px solid #d6d6d6;
			overflow: hidden;
			/* Reset default browser styling */
			-webkit-appearance: none;
			-moz-appearance: none;
			appearance: none;
		}

		/* Chrome/Safari/Edge progress bar background */
		.render_progress::-webkit-progress-bar {
			background-color: #f2f2f2;
			border-radius: 50px;
		}

		/* Chrome/Safari/Edge progress bar value */
		.render_progress::-webkit-progress-value {
			background-color: #dc9600;
			border-radius: 50px;
			transition: width 0.3s ease;
		}

		.render_progress.success::-webkit-progress-value {
			background-color: #0b8400;
		}

		/* Firefox progress bar */
		.render_progress::-moz-progress-bar {
			background-color: #dc9600;
			border-radius: 50px;
		}

		.render_progress.success::-moz-progress-bar {
			background-color: #0b8400;
		}

		/* Standard progress bar (for browsers that support it) */
		.render_progress[value] {
			/* Fallback for browsers without vendor prefixes */
			background-color: #f2f2f2;
		}

		.chip_img {
			width: 44px;
			height: 44px;
			border-radius: 10px;
		}

		.chip_img > img {
			width: 70%;
			height: 70%;
			object-fit: cover;
			object-position: center;
			overflow: visible;
		}

		.chip_img.warning > img {
			animation: rotate 2s infinite;
		}

		@keyframes rotate {
			from {
				transform: rotate(0deg);
			}
			to {
				transform: rotate(360deg);
			}
		}
	</style>
{/snippet}

<style>
	:global(body) {
		background-color: white;
	}

	.player_console {
		width: 100%;
		height: fit-content;
		background-color: #f2f2f2;
		border-radius: 30px;
		border: 1px solid #d6d6d6;
		padding: 20px 15px;
	}

	.timeline {
		width: 100%;
		height: fit-content;
		border-radius: 17px;
		background-color: #ffffff;
		border: 1px solid #d6d6d6;
		padding: 5px;
		overflow: hidden;
	}
</style>
