import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J14:L14').values = [[
  'ทดสอบการยกเลิกการจองฝั่งร้านสำเร็จ: ลูกค้ายกเลิกการจองครัวซองต์เนยสด อาหารกลับเข้าระบบให้ขายต่อ และร้านได้รับการแจ้งเตือนข้อความ “ลูกค้ายกเลิกการจอง”',
  'ผ่าน',
  'ผู้ทดสอบ: เจ้าของร้าน | ร้านได้รับแจ้งเตือนการยกเลิกทันที และตรวจพบรายการอาหารกลับมาให้ลูกค้าจองต่อได้',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D13:L14', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 360,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D13:L14', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
