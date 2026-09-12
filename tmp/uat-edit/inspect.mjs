import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = 'C:/Users/Admin/Downloads/G11_UAT.xlsx';
const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);
for (const range of ['A1:L4', 'A1:L22']) {
  const summary = await workbook.inspect({
    kind: 'table,computedStyle', sheetId: 'UAT', range, maxChars: 12000,
    tableMaxRows: 24, tableMaxCols: 12, tableMaxCellChars: 250,
  });
  console.log(`--- ${range} ---`);
  console.log(summary.ndjson);
}
const image = await workbook.render({ sheetName: 'UAT', range: 'A1:L4', scale: 1, format: 'png' });
console.log(`Rendered preview bytes: ${(await image.arrayBuffer()).byteLength}`);
