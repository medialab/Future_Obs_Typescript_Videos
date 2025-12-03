import Papa from 'papaparse';
import etro from 'etro';
import fallbackVideoSrc from '$lib/assets/testVideo.mp4';


type VideoData = {
    title: string;
    date: string;
    location: string;
    commentAuthor: string;
    comments: string[];
}

const allVideos: Record<string, string> = import.meta.glob('/src/lib/assets/videos/*.mp4', { eager: true });
export const allVideosPaths = Object.keys(allVideos);

export const csvToJson = (csv: string) => {
    const j = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
    });

    return j;
}

async function getVideoDuration(src: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            resolve(video.duration);
        };
        video.onerror = () => reject(new Error('Failed to load video metadata'));
        video.src = src;
    });
}

export async function createVideo(canvas: HTMLCanvasElement, videoSrc: string, bgImg: string, videoData: VideoData): Promise<etro.Movie> {

    // Wait for Rethink Sans font to load before rendering canvas text
    await document.fonts.load('italic 16px "Rethink Sans"');
    console.log("videoSrc :", videoSrc);
    console.log("videoData :", videoData);
    console.log('Font loaded');

    if (videoSrc === undefined || videoSrc === '') {
        console.error('Video source not found >>> Backfalling');
        videoSrc = fallbackVideoSrc;
        console.log('Using fallback video source:', videoSrc);
    }

    let movie: etro.Movie;
    let canvasWidth = 1920/2;
    let canvasHeight = 1080/2;
    let clipDuration = await getVideoDuration(videoSrc);

    console.log('Source video duration (seconds):', clipDuration);

    const videoWidth = 600;
    const videoHeight = videoWidth * (9 / 16) + 25; // 337.5px - maintains 16:9 ratio
    const videoTopOffset = 20; // Offset from vertical center (positive = down, negative = up)

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.getContext('2d', { willReadFrequently: true });
    
    movie = new etro.Movie({ canvas });

    const bgImageLayer = addBgImage(bgImg, clipDuration, canvasWidth, canvasHeight);
    const locationText = addTextFrame(videoData.location, [10, canvasHeight-20], 15, etro.parseColor('black'), clipDuration, "left");
    const dateText = addTextFrame(videoData.date, [canvasWidth-10, canvasHeight-20], 15, etro.parseColor('black'), clipDuration, "right")
    const titleTexts = addTextFrame(wrapText(videoData.title, 80), [canvasWidth/2, 10], 24, etro.parseColor('black'), clipDuration, "center", false)
    
    const videoLayer = addVideoFrame(clipDuration, [15, (canvasHeight - videoHeight) / 2 + videoTopOffset], videoWidth, videoHeight, videoSrc);
    const commentAuthors = addTextFrame(videoData.commentAuthor, [20+videoWidth, (canvasHeight/3)], 12, etro.parseColor('white'), clipDuration, "left", true);
    const comments = addTextFrame(wrapText(videoData.comments, 40), [20+videoWidth, (canvasHeight/3)+30], 15, etro.parseColor('white'), clipDuration, "left");
    
    try {   
        movie.layers.push(videoLayer);
        movie.layers.push(bgImageLayer);
        movie.layers.push(...locationText);
        movie.layers.push(...dateText);
        for (const titleLayer of titleTexts) {
            movie.layers.push(titleLayer);
        }
        for (const commentAuthor of commentAuthors) {
            movie.layers.push(commentAuthor);
        }
        for (const comment of comments) {
            movie.layers.push(comment);
        }
    } catch (error) {
        console.error(error);
    }

    return movie;
}

function addTextFrame(lines:string[] | string, position: [number, number], textSize: number, color: etro.Color, duration: number, textalign: "left" | "center" | "right", isItalic: boolean = false) {
    if (typeof lines === 'string') {
        lines = wrapText(lines, 80); //Guard for single text strings
    }

    let layers: etro.layer.Text[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const linePosition: [number, number] = [position[0], position[1] + (i * textSize * 1.2)];
        if (i < 2) {
            layers.push(new etro.layer.Text({
                startTime: 0,
                duration: duration,
                text: line,
                textX: linePosition[0],
                textY: linePosition[1],
                color: color,
                font: `${isItalic ? 'italic' : 'normal'} ${textSize}px "Rethink Sans"`,
                opacity: isItalic ? 0.5 : 1,
                textAlign: textalign,
                textBaseline: "top",
            }));
        } 
    }

    return layers;
}

function wrapText(text: string, maxCharsPerLine = 80) {
    if (!text) return '';

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const tentative = currentLine ? `${currentLine} ${word}` : word;
        if (tentative.length <= maxCharsPerLine) {
            currentLine = tentative;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) lines.push(currentLine);

    return lines;
}

function addBgImage(imgSrc: string, duration: number, width: number, height: number) {
    const img = new Image();
    img.src = imgSrc;
    
    const l = new etro.layer.Image({
        startTime: 0,
        duration: duration,
        source: img,
        destWidth: width,
        destHeight: height,
    });

    return l;
}

function addVideoFrame(duration: number, position: [number, number], width: number, height: number, videoSrc: string) {
    const l = new etro.layer.Video({
        startTime: 0,
        duration: duration,
        source: videoSrc, // also accepts an `HTMLVideoElement`
        sourceStartTime: 0,
        x: position[0],          // Layer position in the movie
        y: position[1],          // Layer position in the movie
        destWidth: width,        // Scale video to this width
        destHeight: height,      // Scale video to this height
        muted: false,
    });

    return l;
}


export async function downloadVideo(
    movie: etro.Movie, 
    videoSrc: string, 
    onProgress: (progress: number) => void,
): Promise<Blob> {
    const totalDuration = await getVideoDuration(videoSrc);
    
    return movie.record({
        frameRate: 30,
        duration: totalDuration,
        type: "video/mp4",
        video: true,
        audio: true,
        onStart: (recorder: MediaRecorder) => {
            console.log('Recording has started');

            recorder.addEventListener('dataavailable', (event) => {
                const progress = (event.timecode / 1000) / totalDuration * 100;
                onProgress(progress);  // Call the callback with progress
            });
            
            const interval = setInterval(() => {
                if (recorder.state === 'recording') {
                    recorder.requestData();
                } else {
                    clearInterval(interval);
                }
            }, 5000);
        },
    }).then((blob) => {
        console.log(`Recorded ${blob.size} bytes`);
        console.log('Video recorded successfully');
        return blob;
    });
}

export async function playVideo(movie: etro.Movie) {
    await movie.play();
}

export function triggerBlobDownload(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}