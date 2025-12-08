import Papa from 'papaparse';
import * as etro from 'etro';
const ytbIcon = '/YoutubeIcon.png';
const instagramIcon = '/InstaIcon.svg';
const facebookIcon = '/FacebookIcon.png';

type VideoData = {
	title: string;
	date: string;
	location: string;
	Comment_authors: string;
	comments: string;
	postAuthor: string;
	platform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'OTHER';
};

export const csvToJson = (csv: string) => {
	const j = Papa.parse(csv, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (header) => header.trim(),
		transform: (value) => value.trim()
	});

	// Generate video paths from ClipName in CSV
	// Videos are now in static/videos/, so paths are /videos/ClipName.mp4
	if (j.data && Array.isArray(j.data)) {
		(j as any).videoPaths = j.data
			.map((row: any) => {
				if (row.ClipName) {
					return `/videos/${row.ClipName}.mp4`;
				}
				return null;
			})
			.filter((path: string | null): path is string => path !== null);
	}

	return j;
};

// Export a function to get video paths from CSV data
export function getAllVideosPathsFromCsv(csvData: any[]): string[] {
	return csvData
		.map((row: any) => {
			if (row.ClipName) {
				return `/videos/${row.ClipName}.mp4`;
			}
			return null;
		})
		.filter((path: string | null): path is string => path !== null);
}

// Keep allVideosPaths for backward compatibility, but it will be empty or deprecated
export const allVideosPaths: string[] = [];

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

export async function createVideo(
	canvas: HTMLCanvasElement,
	videoSrc: string,
	bgImg: string,
	videoData: VideoData
): Promise<etro.Movie> {
	// Wait for Rethink Sans font to load before rendering canvas text
	// Fonts are preloaded in app.html, so this should be quick
	try {
		await Promise.race([
			document.fonts.ready.then(() => document.fonts.load('italic 16px "Rethink Sans"')),
			new Promise((_, reject) => setTimeout(() => reject(new Error('Font load timeout')), 2000))
		]);
		console.log('Font loaded');
	} catch (error) {
		console.warn('Font loading failed or timed out, continuing anyway:', error);
		// Continue even if font fails to load - browser will use fallback
	}

	console.log('videoSrc :', videoSrc);
	console.log('videoData :', videoData);

	if (videoSrc === undefined || videoSrc === '') {
		console.error('Video source not found');
		throw new Error('Video source not found');
	}

	let movie: etro.Movie;
	let canvasWidth = 1920 / 2;
	let canvasHeight = 1080 / 2;
	let clipDuration = await getVideoDuration(videoSrc);

	console.log('Source video duration (seconds):', clipDuration);

	const videoWidth = 600;
	const videoHeight = videoWidth * (9 / 16) + 25; // 337.5px - maintains 16:9 ratio
	const videoTopOffset = 20; // Offset from vertical center (positive = down, negative = up)

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	const ctx = canvas.getContext('2d', {
		willReadFrequently: false, // Change from true to false for better rendering performance
		alpha: false,
		desynchronized: false,
		colorSpace: 'srgb'
	});
	if (!ctx) {
		throw new Error('Failed to get 2d context from canvas');
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	movie = new etro.Movie({ canvas });

	const bgImageLayer = addBgImage(bgImg, clipDuration, canvasWidth, canvasHeight);
	const locationText = addTextFrame(
		videoData.location,
		[10, canvasHeight - 20],
		15,
		etro.parseColor('black'),
		0,
		clipDuration,
		'left'
	);
	const dateText = addTextFrame(
		videoData.date,
		[canvasWidth - 10, canvasHeight - 20],
		15,
		etro.parseColor('black'),
		0,
		clipDuration,
		'right'
	);
	const titleTexts = addTextFrame(
		wrapText(videoData.title, 80),
		[canvasWidth / 2, 10],
		24,
		etro.parseColor('black'),
		0,
		clipDuration,
		'center',
		false
	);

	const authorText: etro.layer.Text[] = addTextFrame(
		videoData.postAuthor,
		[35, canvasHeight / 2 + videoHeight / 2 - 10],
		12,
		etro.parseColor('black'),
		0,
		clipDuration,
		'left'
	);

	const videoLayer = addVideoFrame(
		clipDuration,
		[15, (canvasHeight - videoHeight) / 2 + videoTopOffset],
		videoWidth,
		videoHeight,
		videoSrc
	);

	const platformIcon = await addPlatformIcon(
		videoData.platform,
		[videoWidth - 50, canvasHeight / 2 + videoHeight / 2 - 18],
		clipDuration
	);

	const commentsArray = splitComments(videoData.comments);
	const Comment_authorsArray = splitComments(videoData.Comment_authors);

	try {
		movie.layers.push(videoLayer);
		movie.layers.push(bgImageLayer);
		movie.layers.push(...authorText);
		movie.layers.push(platformIcon);
		movie.layers.push(...locationText);
		movie.layers.push(...dateText);

		for (const titleLayer of titleTexts) {
			movie.layers.push(titleLayer);
		}

		for (let i = 0; i < Comment_authorsArray.length; i++) {
			const singleCommentAuthorDuration = clipDuration / Comment_authorsArray.length;
			const startTime = i * singleCommentAuthorDuration;

			const Comment_authors = addTextFrame(
				Comment_authorsArray[i],
				[20 + videoWidth, canvasHeight / 3],
				12,
				etro.parseColor('white'),
				startTime,
				singleCommentAuthorDuration,
				'left',
				true
			);

			for (const cA of Comment_authors) {
				movie.layers.push(cA);
			}
		}

		for (let i = 0; i < commentsArray.length; i++) {
			const singleCommentDuration = clipDuration / commentsArray.length;
			const startTime = i * singleCommentDuration;

			const uniqueComment: etro.layer.Text[] = addTextFrame(
				wrapText(commentsArray[i], 40),
				[20 + videoWidth, canvasHeight / 3 + 30],
				15,
				etro.parseColor('white'),
				startTime,
				singleCommentDuration,
				'left'
			);

			for (const c of uniqueComment) {
				movie.layers.push(c);
			}
		}
	} catch (error) {
		console.error(error);
	}

	return movie;
}

function splitComments(comments: string): string[] {
	return comments
		.split('§')
		.map((comment) => comment.trim())
		.filter((comment) => comment !== '');
}

async function addPlatformIcon(
	platform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK' | 'OTHER',
	position: [number, number],
	duration: number
): Promise<etro.layer.Image> {
	let finalIcon: string;

	if (platform === 'YOUTUBE') {
		finalIcon = ytbIcon;
	} else if (platform === 'INSTAGRAM') {
		finalIcon = instagramIcon;
	} else if (platform === 'FACEBOOK') {
		finalIcon = facebookIcon;
	} else {
		finalIcon = ytbIcon;
	}

	const img = new Image();
	img.src = finalIcon;

	// Wait for image to load to get natural dimensions
	await new Promise((resolve, reject) => {
		img.onload = resolve;
		img.onerror = reject;
	});

	const desiredWidth = 30;
	// Calculate height to maintain aspect ratio
	const aspectRatio = img.naturalHeight / img.naturalWidth;
	const desiredHeight = desiredWidth * aspectRatio;

	const layerImg = new etro.layer.Image({
		startTime: 0,
		duration: duration,
		source: img,
		x: position[0],
		y: position[1],
		destWidth: desiredWidth,
		destHeight: desiredHeight
	});

	return layerImg;
}

function addTextFrame(
	lines: string[] | string,
	position: [number, number],
	textSize: number,
	color: etro.Color,
	startTime: number = 0,
	duration: number,
	textalign: 'left' | 'center' | 'right',
	isItalic: boolean = false
) {
	if (typeof lines === 'string') {
		lines = wrapText(lines, 80); //Guard for single text strings
	}

	let layers: etro.layer.Text[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const linePosition: [number, number] = [position[0], position[1] + i * textSize * 1.2];
		if (i < 2) {
			layers.push(
				new etro.layer.Text({
					startTime: startTime,
					duration: duration,
					text: line,
					textX: linePosition[0],
					textY: linePosition[1],
					color: color,
					font: `${isItalic ? 'italic' : 'normal'} ${textSize}px "Rethink Sans"`,
					opacity: isItalic ? 0.5 : 1,
					textAlign: textalign,
					textBaseline: 'top'
				})
			);
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
		destHeight: height
	});

	return l;
}

function addVideoFrame(
	duration: number,
	position: [number, number],
	width: number,
	height: number,
	videoSrc: string
) {
	const l = new etro.layer.Video({
		startTime: 0,
		duration: duration,
		source: videoSrc, // also accepts an `HTMLVideoElement`
		sourceStartTime: 0,
		x: position[0], // Layer position in the movie
		y: position[1], // Layer position in the movie
		destWidth: width, // Scale video to this width
		destHeight: height, // Scale video to this height
		muted: false
	});

	return l;
}

export async function downloadVideo(
	movie: etro.Movie,
	videoSrc: string,
	onProgress: (progress: number) => void
): Promise<Blob> {
	const totalDuration = await getVideoDuration(videoSrc);

	// Check available codecs and prefer H.264
	const getPreferredMimeType = (): string => {
		// Try H.264 codecs first (most compatible with QuickTime)
		const h264Options = [
			'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', // H.264 Baseline + AAC
			'video/mp4; codecs="avc1.4D001E, mp4a.40.2"', // H.264 Main + AAC
			'video/mp4; codecs="avc1.64001E, mp4a.40.2"', // H.264 High + AAC
			'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline only
			'video/mp4; codecs="avc1.4D001E"' // H.264 Main only
		];

		// Check which codec is supported
		for (const mimeType of h264Options) {
			if (MediaRecorder.isTypeSupported(mimeType)) {
				console.log('Using codec:', mimeType);
				return mimeType;
			}
		}

		// Fallback to default
		console.warn('H.264 not supported, falling back to default codec');
		return 'video/mp4';
	};

	const mimeType = getPreferredMimeType();

	return movie
		.record({
			frameRate: 30,
			duration: totalDuration,
			type: mimeType,
			video: true,
			audio: true,
			onStart: (recorder: MediaRecorder) => {
				console.log('Recording has started');
				console.log('MediaRecorder mimeType:', recorder.mimeType);

				recorder.addEventListener('dataavailable', (event) => {
					const progress = (event.timecode / 1000 / totalDuration) * 100;
					console.log('progress :', progress);
					onProgress(progress); // Call the callback with progress
				});

				const interval = setInterval(() => {
					if (recorder.state === 'recording') {
						recorder.requestData();
					} else {
						clearInterval(interval);
					}
				}, 5000);
			}
		})
		.then((blob: Blob) => {
			console.log(`Recorded ${blob.size} bytes`);
			console.log('Video recorded successfully');
			console.log('Blob type:', blob.type);
			return blob;
		});
}

export async function playVideo(movie: etro.Movie) {
	await movie.play();
}

export async function triggerBlobDownload(blob: Blob, filename: string) {
	if (blob.size === 0) {
		console.error('ERROR: Blob is empty!');
		return;
	}

	// Proceed with download
	const blobUrl = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = blobUrl;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}
