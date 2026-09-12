import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load('C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx'));
const inspect = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'A11:L15', include: 'values,formulas',
  tableMaxRows: 5, tableMaxCols: 12, tableMaxCellChars: 250,
});
console.log(inspect.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'A11:L15', scale: 1, format: 'png' });
console.log(`Rendered inspection preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
