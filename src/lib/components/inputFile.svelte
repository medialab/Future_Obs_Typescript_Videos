<script lang="ts">
    import trashIcon from '$lib/assets/icons/trash.svg';
	import correctIcon from '$lib/assets/icons/correct.svg';
	import incorrectIcon from '$lib/assets/icons/incorrect.svg';
	import pendingIcon from '$lib/assets/icons/pending.svg';
    import { clearFile } from '$lib/fileStorage';
    import { csvVideoFilenames, uploadedVideoFiles, unknownFiles } from '$lib/stores';
    import { afterNavigate } from '$app/navigation';
    import { untrack } from 'svelte';

	let props = $props<{ file: Blob}>();

	let status = $state<'pending' | 'correct' | 'incorrect'>('pending');

    const getFileStatus = async (fileName: string, csvVideoFilenames: string[]) => {
		if (csvVideoFilenames && csvVideoFilenames.length > 0) {
            
            const cleanFilename = fileName.replace('.mp4', '').replace('.mov', '');
			const foundFilename = csvVideoFilenames.find(videoFilename => videoFilename.includes(cleanFilename));

            if (!foundFilename) {
				untrack(() =>
					unknownFiles.update((filenames) =>
						filenames.includes(fileName) ? filenames : [...filenames, fileName]
					)
				);
			}

			return foundFilename ? 'correct' : 'incorrect';
		} else {
			return 'pending';
		}
        
	};

    const removeFile = async (fileName: string) => {
        untrack(() => uploadedVideoFiles.update(videoFiles => videoFiles.filter(videoFile => videoFile.name !== fileName)));
        untrack(() => unknownFiles.update(unknownFiles => unknownFiles.filter(unknownFile => unknownFile !== fileName)));
        try {
            await clearFile(fileName);
        } catch (error) {
            console.error('Error clearing file:', error);
        }
    };

	afterNavigate(async () => {
		getFileStatus(props.file.name, $csvVideoFilenames).then((newStatus) => {
			status = newStatus;
		});
	});

	$effect(() => {
		getFileStatus(props.file.name, $csvVideoFilenames).then((newStatus) => {
			status = newStatus;
		});
	});

</script>
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
				{props.file?.name || 'Pdf_attached_first_superlongnames.PDF.csv'}
			</p>
			<p class="microtitle">{Math.ceil(props.file?.size / 1024 / 1024) + ' MB' || '100 MB'}</p>
		</div>
		<button class="trash_btn flex centered" onclick={async () => await removeFile(props.file.name)}>
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
			max-width: 20ch;
		}

		.trash_btn {
			width: 25px;
			height: 25px;
			cursor: pointer;
			pointer-events: all;
            border: none;
		}

        .trash_btn:hover > img {
            transform: scale(1.1) rotate(2deg);
            transition: transform 0.3s ease-in-out;
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