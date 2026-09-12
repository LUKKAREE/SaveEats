import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'J21:L22', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 3, tableMaxCellChars: 480,
});
console.log(check.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D21:L22', scale: 1, format: 'png' });
await fs.writeFile('C:/SaveEats/outputs/uat_updated/uat_rows_21_to_22_preview.png', new Uint8Array(await preview.arrayBuffer()));
console.log('Saved verification preview');
