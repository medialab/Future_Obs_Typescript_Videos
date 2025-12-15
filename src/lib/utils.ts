import Papa from 'papaparse';

export const csvToJson = async (csv: File, uploadedFiles?: File[]) => {
	const j = Papa.parse(await csv.text(), {
		header: true,
		skipEmptyLines: true,
		transformHeader: (header) => header.trim(),
		transform: (value) => value.trim()
	});

	if (j.data && Array.isArray(j.data)) {
		if (uploadedFiles && uploadedFiles.length > 0) {
			j.data = j.data.map((row: any) => {
				const clipName = row.ClipName?.trim();

				if (clipName) {
					//console.log('clipName :', clipName);
					//console.log('filenames:', uploadedFiles);
					const matchingFile = uploadedFiles.find(
						(f) => f.name.replace('.mp4', '').replace('.mov', '') === clipName
					);

					if (matchingFile) {
						// Create blob URL from the matching file and set it as videoSrc
						row.videoSrc = URL.createObjectURL(matchingFile);
					}
				}

				return row;
			});
		}

		// Keep videoPaths for backward compatibility
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
