<script lang="ts">
	import excelIcon from '$lib/assets/icons/excel.svg';
	import videoIcon from '$lib/assets/icons/video.svg';
	import Header from '$lib/components/header.svelte';

	import Alert from '$lib/components/alerts.svelte';
	import eraseIcon from '$lib/assets/icons/erase.svg';
	import arrowIcon from '$lib/assets/icons/arrow.svg';
	import Papa from 'papaparse';
	import InputFile from '$lib/components/inputFile.svelte';
	import trashIcon from '$lib/assets/icons/delete.svg';
	import {
		csvVideoFilenames,
		uploadedVideoFiles,
		missingFilenames,
		uploadedCsvFile,
		unknownFiles
	} from '$lib/stores';
	import { extractCsvData } from '$lib/tableUtils';
	import { untrack } from 'svelte';
	import { clearFiles } from '$lib/fileStorage';

	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let csvData = $state<string>('');

	$inspect('uploadedVideoFiles :', $uploadedVideoFiles);

	const clearQueue = async () => {
		$uploadedVideoFiles = [];
		$unknownFiles = [];
		try {
			await clearFiles();
		} catch (error) {
			console.error('Error clearing files:', error);
		}
	};

	$inspect('uploadedCsvFile :', $uploadedCsvFile);

	

	const checkCrossFiles = async () => {
		const uploadedFileNames = $uploadedVideoFiles.map((file) => file.name);
		const missing: string[] = [];

		for (const csvFilename of $csvVideoFilenames) {
			const hasMatch = uploadedFileNames.some(
				(uploadedName) =>
					uploadedName === csvFilename ||
					uploadedName === `${csvFilename}.mp4` ||
					uploadedName.startsWith(csvFilename)
			);

			if (!hasMatch) {
				missing.push(csvFilename);
			}
		}

		untrack(() => {
			$missingFilenames = missing;
		});
	};

	const updateCsvFilenames = async (csvFile: File): Promise<string[]> => {
		if (!csvFile) return [];
		const names = await extractCsvData(csvFile);
		// Remove any name that is blank or consists only of whitespace
		return names.filter((name) => typeof name === 'string' && name.trim() !== '');
	};

	//We reactively update the value of csvVideoFilenames
	$effect(() => {
		console.log('$effect triggered, uploadedCsvFile:', $uploadedCsvFile);
		if (!$uploadedCsvFile) {
			csvVideoFilenames.set([]);
			return;
		}

		updateCsvFilenames($uploadedCsvFile)
			.then((names) => {
				console.log('updateCsvFilenames resolved with:', names);
				csvVideoFilenames.set(names);
				checkCrossFiles();
			})
			.catch((err) => {
				console.error('Error updating CSV filenames:', err);
			});
	});

	// Reactively check cross files when videos are uploaded/removed
	$effect(() => {
		// Only check if we have both CSV and video files
		if ($uploadedCsvFile && $csvVideoFilenames.length > 0) {
			checkCrossFiles();
		}
	});

	const isValidCsvFile = (file: File): boolean => {
		const csvMimeTypes = ['text/csv', 'application/csv', 'text/comma-separated-values'];
		const xlsxMimeTypes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel'
		];
		const csvExtensions = ['.csv'];
		const xlsxExtensions = ['.xlsx', '.xls'];
		const fileName = file.name.toLowerCase();

		return (
			[...csvMimeTypes, ...xlsxMimeTypes].includes(file.type.toLowerCase()) ||
			[...csvExtensions, ...xlsxExtensions].some((ext) => fileName.endsWith(ext))
		);
	};

	const isValidVideoFile = (file: File): boolean => {
		const videoMimeTypes = [
			'video/mp4',
			'video/mpeg',
			'video/quicktime',
			'video/x-msvideo',
			'video/x-matroska'
		];
		const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
		const fileName = file.name.toLowerCase();

		return (
			videoMimeTypes.includes(file.type.toLowerCase()) ||
			videoExtensions.some((ext) => fileName.endsWith(ext))
		);
	};

	const handleFiles = async (files: FileList | null, type: 'csv' | 'video') => {
		if (!files?.length) return;

		if (type === 'csv') {
			// Filter to only CSV files and take the first one
			const csvFiles = Array.from(files).filter(isValidCsvFile);

			if (csvFiles.length === 0) {
				console.warn('No valid CSV files found in dropped files');
				return;
			}

			if ($uploadedCsvFile) {
				csvVideoFilenames.set([]);
				$missingFilenames = [];
				$unknownFiles = [];
			}

			$uploadedCsvFile = csvFiles[0];
			csvVideoFilenames.set(await extractCsvData($uploadedCsvFile));
		} else {
			// Filter to only video files
			const videoFiles = Array.from(files).filter(isValidVideoFile);

			if (videoFiles.length === 0) {
				console.warn('No valid video files found in dropped files');
				return;
			}

			const merged = [...$uploadedVideoFiles, ...videoFiles];
			// keep unique by name to avoid duplicates from re-selecting same file
			const seen = new Set<string>();
			$uploadedVideoFiles = merged.filter((file) => {
				if (seen.has(file.name)) return false;
				seen.add(file.name);
				return true;
			});
		}
	};

	$inspect('csvVideoFilenames :', $csvVideoFilenames);
	$inspect('uploadedCsvFile :', $uploadedCsvFile);
</script>

<Header type="home" />

{#snippet upload_container(icon: string, files: boolean, type: 'csv' | 'video')}
	<div class="upload_greyzone flex v centered">
		<div
			class="upload_whitezone flex v centered"
			id="dragzone {type === 'csv' ? 'CSV' : 'Video'}"
			ondragover={(e) => e.preventDefault()}
			ondragenter={(e) => e.preventDefault()}
			ondrop={(e) => {
				e.preventDefault();
				handleFiles(e.dataTransfer?.files || null, type);
			}}
			role="region"
			aria-label="Upload {type === 'csv' ? 'CSV' : 'Video'} dropzone"
		>
			<label for="upload_input" class="flex v centered minigap upload_label">
				<img src={icon} alt="icon" />
				<p class="title">
					{#if type === 'csv' && $uploadedCsvFile === undefined}
						{'Upload your CSV here'}
					{:else if type === 'csv' && $uploadedCsvFile !== undefined}
						{$uploadedCsvFile?.name}
					{:else if type === 'video'}
						Drop your Videos here
					{/if}
				</p>

				{#if type === 'csv' && $uploadedCsvFile}
					{Math.ceil($uploadedCsvFile?.size / 1024) + ' KB' || 'Max 500 MB'}
				{:else if type === 'video' && $uploadedVideoFiles.length > 0}
					{$uploadedVideoFiles.length} videos uploaded
				{:else}
					In batch, or single files
				{/if}
			</label>
			{#if type === 'csv'}
				<input
					type="file"
					accept=".csv, .xlsx"
					multiple={false}
					id="csv_input"
					class="upload_input"
					aria-label="Upload CSV files"
					onchange={(e) => handleFiles((e.target as HTMLInputElement).files, type)}
				/>
			{:else if type === 'video'}
				<input
					type="file"
					accept=".mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.mpeg,.mpg,.m4v,.3gp,.3g2"
					multiple={true}
					id="video_input"
					class="upload_input"
					aria-label="Upload Video files"
					onchange={(e) => handleFiles((e.target as HTMLInputElement).files, type)}
				/>
			{/if}
		</div>

		{#if files}
			<div class="uploaded_files_container flex r minigap">
				{#each $uploadedVideoFiles as file}
					<InputFile {file} />
				{/each}
			</div>
		{/if}
		{#if type === 'csv' && $uploadedCsvFile !== undefined}
			<button
				class="erase_csv warning flex centered"
				onclick={() => {
					$uploadedCsvFile = undefined; //reset uploadedCsvFile
					$csvVideoFilenames = []; //reset csvVideoFilenames
					$missingFilenames = []; //reset missingFilenames
					$unknownFiles = []; //reset unknownFiles
				}}
			>
				<img src={trashIcon} alt="erase" />
			</button>
		{/if}
	</div>

	<style>
		.upload_greyzone {
			background-color: #f0f0f0;
			padding: 20px;
			border-radius: 30px;
			width: 100%;
			height: fit-content;
			border: 1px solid #d6d6d6;
			transition: all 0.3s ease-in-out;
			position: relative;
		}

		.erase_csv {
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			right: -2%;
		}

		.erase_csv:hover {
			transform: translateY(-50%) scale(1.1) rotate(2deg);
			transition: transform 0.3s ease-in-out;
		}

		.upload_greyzone:hover {
			background-color: rgb(219, 219, 219);
			transition: all 0.3s ease-in-out;
		}

		.upload_whitezone {
			position: relative;
			width: 100%;
			height: fit-content;
			background-color: #ffffff;
			border-radius: 20px;
			border: 1px dashed #c6c6c6;
			padding: 10px;
		}

		.upload_whitezone > p {
			color: #000000 !important;
		}

		.upload_label {
			pointer-events: none;
			user-select: none;
			text-align: center;
		}

		.upload_input {
			position: absolute;
			/* Fallback for browsers that don't support inset (Safari < 14.1) */
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			/* Modern browsers with inset support */
			inset: 0;
			width: 100%;
			height: 100%;
			opacity: 0;
			cursor: pointer;
		}

		.uploaded_files_container {
			width: 100%;
			flex-wrap: wrap;
			justify-content: space-between;
		}
	</style>
{/snippet}

<section class="main_grid">
	<div class="flex v" id="videofiles_infos">
		<p class="title">Uploaded Files</p>
		<div class="flex v">
			<div class="flex v minigap">
				<p class="microtitle">Uploaded videos:</p>
				<p class="annotation">{$uploadedVideoFiles.length} videos</p>
			</div>
			<div class="flex v minigap">
				<p class="microtitle">Total payload:</p>
				<p class="annotation">
					{Math.ceil($uploadedVideoFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024)} mb
				</p>
			</div>
			<div class="flex v minigap">
				<p class="microtitle">CSV Rows:</p>
				{#if csvData}
					<p class="annotation">{Papa.parse(csvData).data.length} rows</p>
				{:else}
					<p class="annotation">0 rows</p>
				{/if}
			</div>
		</div>
	</div>
	<div class="upload_container flex v">
		{@render upload_container(excelIcon, false, 'csv')}
		{@render upload_container(videoIcon, true, 'video')}
		<div class="flex h spacebetween">
			<button class="flex h minigap centered" onclick={clearQueue}>
				<img src={eraseIcon} alt="Process all" class="btn_icon" />
				<p class="annotation" style="color: #C7C7C7;">Clear whole queue</p>
			</button>

			<button
				class="flex h minigap success centered"
				class:disabled={$missingFilenames.length !== 0 ||
					!$uploadedCsvFile ||
					$uploadedVideoFiles.length === 0}
			>
				<a href="/composer">
					<p class="annotation">Process all</p>
				</a>
				<img src={arrowIcon} alt="Process all" class="btn_icon" />
			</button>
		</div>
	</div>
	<div class="flex v" id="alert_container" style="overflow: hidden;">
		<p class="title">Alerts</p>
		<div class="flex v minigap">
			{#if $missingFilenames.length > 0 || $unknownFiles.length > 0}
				{#each $missingFilenames as filename, index}
					<div
						in:fly={{ x: 100, duration: 300, easing: cubicOut, delay: index * 100 }}
						out:fly={{ x: 100, duration: 300, easing: cubicOut, delay: index * 100 }}
					>
						<Alert type="error" message="No file uploaded for {filename}" />
					</div>
				{/each}
				{#each $unknownFiles as unknownFile, index}
					<div
						in:fly={{ x: 100, duration: 300, easing: cubicOut, delay: index * 100 }}
						out:fly={{ x: 100, duration: 300, easing: cubicOut, delay: index * 100 }}
					>
						<Alert type="warning" message="No csv row for {unknownFile}" />
					</div>
				{/each}
			{:else}
				<p class="annotation">No alerts, everything is good!</p>
			{/if}
		</div>
	</div>
</section>

<style>
</style>
