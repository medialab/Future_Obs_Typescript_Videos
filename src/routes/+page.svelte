<script lang="ts">
    import etro from 'etro';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { error } from '@sveltejs/kit';
    import bgImg from '$lib/assets/BACKGROUND.png';
    
    import testCsv from '$lib/assets/test.csv?raw';
    
    import { csvToJson, createVideo, downloadVideo, playVideo, triggerBlobDownload, allVideosPaths } from '$lib/utils';

    type RenderedVideo = {
        filename: string;
        blob: Blob;
    };

    let canvas: HTMLCanvasElement;
    let videos = $state<any[]>([]);
    let isRendering = $state(false);
    let renderProgress = $state(0);
    let currentScene = $state(0);
    let renderStatus = $state('Ready');
    let renderedVideos = $state<RenderedVideo[]>([]);
    
    onMount(async () => {
        if (!browser) return;

        const json = csvToJson(testCsv);
        videos = json.data
    });

    async function renderAllVideos() {
        isRendering = true;
        renderedVideos = [];
        
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            video.videoSrc = allVideosPaths.find(path => path.includes(video.ClipName)) || '';
            

            if (!video.videoSrc) {
                console.error(`Video source not found for ${video.ClipName}`);
                continue;
            }

            currentScene = i + 1;
            
            console.log(`Rendering ${currentScene}/${videos.length}:`, video.ClipName);
            
            const movie = await createVideo(canvas, video.videoSrc, bgImg, {
                title: video.Title || 'No title',
                date: video.Date || 'No date',
                location: video.Location || 'No location',
                commentAuthor: video.Comment_authors?.split('§')|| 'Anonymous',
                comment: video.Comments?.split('§')[0]?.trim() || 'No comment',
            });

            await movie.refresh(); 

            const filename = `${video.ClipName+i}.mp4`;

            const blob = await downloadVideo(
                movie, 
                video.videoSrc, 
                (progress) => { renderProgress = progress; },
            );

            renderedVideos = [
                ...renderedVideos,
                { filename, blob }
            ];

            await new Promise(r => setTimeout(r, 500));
        }
            
        
        isRendering = false;
        renderProgress = 0;
        currentScene = 0;
        console.log('All scenes rendered!');
    }

    function downloadRenderedVideo(video: RenderedVideo) {
        triggerBlobDownload(video.blob, video.filename);
    }

    async function PlayAllVideos() {
        for (const video of videos) {
            console.log("playing video", video.ClipName);
            video.videoSrc = allVideosPaths.find(path => path.includes(video.ClipName)) || '';
            console.log("video", video.Comments?.split('§'));
            const movie = await createVideo(canvas, video.videoSrc, bgImg,
            
            {
                title: video.Title,
                date: video.Date,
                location: video.Location,
                commentAuthor: video.Comment_authors?.split('§')[0]?.trim() || 'Anonymous',
                comments: video.Comments?.split('§') || 'No comment',
            });
            
            await playVideo(movie);
            await new Promise(r => setTimeout(r, 500))
        };

        console.log('All videos played!');
    }

</script>

<canvas bind:this={canvas} class="canvas"></canvas>

<div class="controls">
    <button onclick={renderAllVideos} disabled={isRendering || videos.length === 0}>
        {isRendering ? 'Rendering (Client)...' : 'Render All (Client)'}
    </button>
    
    <button onclick={PlayAllVideos} disabled={isRendering || videos.length === 0}>
        Play All Videos
    </button>
    
    <p>Scenes loaded: {videos.length}</p>
    {#if renderStatus}
        <p class="status">{renderStatus}</p>
    {/if}

    {#if renderedVideos.length}
        <div class="rendered-list">
            <h3>Rendered videos</h3>
            {#each renderedVideos as video}
                <div class="rendered-item">
                    <span>{video.filename}</span>
                    <button onclick={() => downloadRenderedVideo(video)}>
                        Download
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>


<style>
    .canvas {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid red;
        overflow: visible;
    }

    .controls {
        position: fixed;
        top: 20px;
        left: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 100;
    }

    .rendered-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
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