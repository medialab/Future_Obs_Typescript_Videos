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
		csvFile = new File([XLSX.utils.sheet_to_csv(firstSheetName)], file.name, {
			type: 'text/csv'
		}) as File;
		console.log('Is xlsx:', isXlsx);
	}

	return csvFile;
};

export const extractCsvData = async (file: File): Promise<string[]> => {
	const csvFile = await parseInputTable(file);
	const csvData = await csvFile.text();
	const outPut = Papa.parse(csvData, {
		skipEmptyLines: 'greedy',
		header: true,
		transformHeader: (header: string) => header.toLowerCase()
	}).data.map((row: any) => row.clipname);

	return outPut;
};

export const csvToJson = async (csv: File) => {
	const csvFile = await parseInputTable(csv); //if the file is xlsx, we turn it into a csv

	let json = Papa.parse(await csvFile.text(), {
		header: true,
		skipEmptyLines: 'greedy',
		transformHeader: (header: string) => header.trim(),
		transform: (value) => value.trim(),
		dynamicTyping: false
	});

	return json;
};

export const isValidCsvFile = (uploadedFile: File): boolean => {
	const csvMimeTypes = ['text/csv', 'application/csv', 'text/comma-separated-values'];
	const xlsxMimeTypes = [
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/vnd.ms-excel'
	];
	const csvExtensions = ['.csv'];
	const xlsxExtensions = ['.xlsx', '.xls'];
	const fileName = uploadedFile.name.toLowerCase();

	return (
		[...csvMimeTypes, ...xlsxMimeTypes].includes(uploadedFile.type.toLowerCase()) ||
		[...csvExtensions, ...xlsxExtensions].some((ext) => fileName.endsWith(ext))
	);
};
