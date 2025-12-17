import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { error } from '@sveltejs/kit';

const parseInputTable = async (file: File): Promise<File> => {
    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    let csvFile: File | undefined = file;

    if (isXlsx) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.Sheets[workbook.SheetNames[0]];
        csvFile = new File([XLSX.utils.sheet_to_csv(firstSheetName)], file.name, { type: 'text/csv' }) as File;
    }

    return csvFile;
};

export const extractCsvData = async (file: File): Promise<string[]> => {
    const csvFile = await parseInputTable(file);
    const csvData = await csvFile.text();
    const outPut = Papa.parse(csvData, {
        header: true,
        transformHeader: (header: string) => header.toLowerCase()
    }).data.map((row: any) => row.clipname);

    return outPut;
};

export const csvToJson = async (csv: File, uploadedFiles?: File[]) => {

    const csvFile = await parseInputTable(csv);

    if (!csvFile) throw error(400, 'Invalid CSV file');

	let j = Papa.parse(await csvFile.text(), {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: (header) => header.trim(),
		transform: (value) => value.trim(),
		dynamicTyping: false
	});

	if (j.data && Array.isArray(j.data)) {
		if (uploadedFiles && uploadedFiles.length > 0) {
			j.data = j.data.map((row: any) => {
				const clipName = row.ClipName?.trim();

				if (clipName) {
					const matchingFile = uploadedFiles.find(
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
        throw error(400, 'We encountered an error parsing the CSV file');
    }

    

	return j;
};
