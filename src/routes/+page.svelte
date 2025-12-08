<script lang="ts">
	import excelIcon from '$lib/assets/icons/excel.svg';
	import videoIcon from '$lib/assets/icons/video.svg';
	import trashIcon from '$lib/assets/icons/trash.svg';
	import correctIcon from '$lib/assets/icons/correct.svg';
	import incorrectIcon from '$lib/assets/icons/incorrect.svg';
	import pendingIcon from '$lib/assets/icons/pending.svg';

	import { onMount } from 'svelte';

	let uploadedCsvFile = $state<File | null>(null);
	let uploadedVideoFiles = $state<File[]>([]);

	const handleFiles = (files: FileList | null, type: 'csv' | 'video') => {
		if (!files?.length) return;

		if (type === 'csv') {
			uploadedCsvFile = files[0];
		} else {
			uploadedVideoFiles = Array.from(files);
		}
	};
</script>

{#snippet uploaded_file(file: File, status: 'pending' | 'correct' | 'incorrect' = 'pending')}
	<div
		class="uploaded_file flex r centered minigap"
		class:correct={status === 'correct'}
		class:incorrect={status === 'incorrect'}
	>
		<div
			style="display: {status === 'pending'
				? 'flex'
				: 'none'}; border: 1px solid #C7C7C7; background-color: #FFF;"
			class="flex centered absolute_icon_container"
		>
			<img
				src={pendingIcon}
				alt="pending"
				class="absolute_icon"
				style="animation: rotate 2s infinite;"
			/>
		</div>
		<div
			style="display: {status === 'correct'
				? 'flex'
				: 'none'}; border: 1px solid #0b8400; background-color: #BCE2B8;"
			class="flex centered absolute_icon_container"
		>
			<img src={correctIcon} alt="correct" class="absolute_icon" />
		</div>
		<div
			style="display: {status === 'incorrect'
				? 'flex'
				: 'none'}; border: 1px solid #dc9600; background-color: #FFEFC1;"
			class="flex centered absolute_icon_container"
		>
			<img src={incorrectIcon} alt="incorrect" class="absolute_icon" />
		</div>

		<div class="file_inner_white flex r centered">
			<p
				class="annotation file_title"
				class:correct={status === 'correct'}
				class:incorrect={status === 'incorrect'}
			>
				{file?.name || 'Pdf_attached_first_superlongnames.PDF.csv'}
			</p>
			<p class="microtitle">{Math.ceil(file?.size / 1024 / 1024) + ' MB' || '100 MB'}</p>
		</div>
		<button class="trash_btn flex centered">
			<img src={trashIcon} alt="trash" />
		</button>
	</div>

	<style>
		.uploaded_file {
			width: 32%;
			padding: 5px 10px 5px 5px;
			border-radius: 15px;
			border: 1px solid #d6d6d6;
			background-color: #f2f2f2;
			position: relative;
		}

		.uploaded_file.correct {
			border: 1px solid #0b8400;
		}

		.correct {
			color: #0b8400;
		}

		.incorrect {
			color: #dc9600;
		}

		.uploaded_file.incorrect {
			border: 1px solid #dc9600;
		}

		.absolute_icon_container {
			position: absolute;
			top: 0;
			right: 0;
			padding: 5px;
			border-radius: 50px;
			transform: translate(30%, -30%);
			background-color: #f2f2f2;
		}

		.absolute_icon {
			width: 9px;
			height: 9px;
		}

		.file_inner_white {
			width: 100%;
			background-color: #ffffff;
			border-radius: 10px;
			padding: 10px;
			justify-content: space-between;
		}

		.file_title {
			line-clamp: 1;
			display: -webkit-inline-box;
			-webkit-line-clamp: 1;
			-webkit-box-orient: vertical;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 10ch;
		}

		.trash_btn {
			width: 25px;
			height: 25px;
			cursor: pointer;
			pointer-events: all;
		}

		@keyframes rotate {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}
	</style>
{/snippet}

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
				{#each uploadedVideoFiles as file}
					{@render uploaded_file(file)}
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
			padding: 15px;
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
				<p class="annotation">13 videos</p>
			</div>
			<div class="flex v minigap">
				<p class="microtitle">Total payload:</p>
				<p class="annotation">450 mb</p>
			</div>
			<div class="flex v minigap">
				<p class="microtitle">CSV Rows:</p>
				<p class="annotation">15 rows</p>
			</div>
		</div>
	</div>
	<div class="upload_container flex v">
		{@render upload_container('Max 500 MB', excelIcon, false, 'csv')}
		{@render upload_container('Max 500 MB', videoIcon, true, 'video')}
	</div>
	<div class="flex v" id="alert_container"></div>
</section>

<style>
	.main_grid {
		display: grid;
		grid-template-columns: repeat(11, 1fr);
		gap: 50px;
		padding: 50px;
		height: 100%;
		width: 100%;
	}

	.main_grid :nth-child(1),
	.main_grid :nth-child(3) {
		grid-column: span 2;
	}

	.main_grid :nth-child(2) {
		grid-column: span 7;
	}
</style>
