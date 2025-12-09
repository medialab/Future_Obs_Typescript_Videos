<script lang="ts">
	import excelIcon from '$lib/assets/icons/excel.svg';
	import videoIcon from '$lib/assets/icons/video.svg';
	import Header from '$lib/components/header.svelte';
	
	import Alert from '$lib/components/alerts.svelte';
	import eraseIcon from '$lib/assets/icons/erase.svg';
	import arrowIcon from '$lib/assets/icons/arrow.svg';
	import Papa from 'papaparse';
	import InputFile from '$lib/components/inputFile.svelte';
	import { csvVideoFilenames, uploadedVideoFiles, missingFilenames, emptyCellsInCsv } from '$lib/stores';
	import { untrack } from 'svelte';

	import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

	let uploadedCsvFile = $state<File | undefined>(undefined);
	let csvData = $state<string>('');

	const clearQueue = () => {
		$uploadedVideoFiles = [];
	};

	const extractCsvData = async (csv: File): Promise<string[]> => {
		csvData = await csv.text();
		console.log('csvData :', csvData);
		return Papa.parse(csvData, { header: true }).data.map((row: any) => row.ClipName);
	};

	//Check all video presence in csv
	$effect(() => {
		const uploadedFileNames = $uploadedVideoFiles.map(file => file.name);
		const missing: string[] = [];

		for (const csvFilename of $csvVideoFilenames) {
			const hasMatch = uploadedFileNames.some(uploadedName => 
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
	});

	$effect(() => {
		if (!csvData || csvData.length === 0) {
			return;
		}

		csvData.split(',').forEach(el => {
			if (el.trim().length > 0) {
				$emptyCellsInCsv.push(el.trim());
			} else {
				$emptyCellsInCsv.splice($emptyCellsInCsv.indexOf(el.trim()), 1);
			}
		});
	});


	const handleFiles = async (files: FileList | null, type: 'csv' | 'video') => {
		if (!files?.length) return;

		if (type === 'csv') {
			uploadedCsvFile = files[0];
			csvVideoFilenames.set(await extractCsvData(uploadedCsvFile));
		} else {
			$uploadedVideoFiles = Array.from(files);
		}
	};
</script>

<Header />

{#snippet upload_container(value: string, icon: string, files: boolean, type: 'csv' | 'video')}
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
					{#if type === 'csv'}
						{uploadedCsvFile?.name || 'Upload your CSV here'}
					{:else}
						Drop your Videos here
					{/if}
				</p>
				<p class="annotation">{value}</p>
			</label>
			<input
				type="file"
				accept={type === 'csv' ? 'csv/*' : 'video/*'}
				multiple={type === 'csv' ? false : true}
				id="upload_input {type === 'csv' ? 'CSV' : 'Video'}"
				class="upload_input"
				aria-label="Upload CSV files"
				onchange={(e) => handleFiles((e.target as HTMLInputElement).files, type)}
			/>
		</div>
		{#if files}
			<div class="uploaded_files_container flex r minigap">
				{#each $uploadedVideoFiles as file}
					<InputFile file={file} />
				{/each}
			</div>
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
				<p class="annotation">{Math.ceil($uploadedVideoFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024)} mb</p>
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
		{@render upload_container('Max 500 MB', excelIcon, false, 'csv')}
		{@render upload_container('Max 500 MB', videoIcon, true, 'video')}
		<div class="flex h spacebetween">

			<button class="flex h minigap centered" onclick={clearQueue}>
				<img src={eraseIcon} alt="Process all" class="btn_icon">
				<p class="annotation" style="color: #C7C7C7;">Clear whole queue</p>
			</button>

			<button class="flex h minigap success centered">
				<p class="annotation">Process all</p>
				<img src={arrowIcon} alt="Process all" class="btn_icon">
			</button>
		
		</div>
	</div>
	<div class="flex v" id="alert_container" style="overflow: hidden;">
		<p class="title">Alerts</p>
		<div class="flex v minigap">
			{#if $missingFilenames.length > 0}
			{#each $missingFilenames as filename, index}
				<div in:fly={{ x: 100, duration: 300, easing: cubicOut, delay: index * 100 }} out:fly={{ x: 100, duration: 300, easing: cubicOut, delay: index * 100 }}>
					<Alert type="error" message="No file uploaded for {filename}" />
				</div>
			{/each}
			{:else}
					<p class="annotation">No alerts, everything is good!</p>
				{/if}
		</div>
	</div>
</section>

<style>
	.main_grid {
		display: grid;
		grid-template-columns: repeat(11, 1fr);
		gap: 50px;
		padding: 20px;
		height: 100%;
		width: 100%;
		margin-top: 100px;
	}

	.main_grid :nth-child(1),
	.main_grid :nth-child(3) {
		grid-column: span 2;
	}

	.main_grid :nth-child(2) {
		grid-column: span 7;
	}
</style>
