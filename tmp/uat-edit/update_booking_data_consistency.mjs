import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J18:L18').values = [[
  'ทดสอบฝั่งร้านพบข้อมูลการจองครบ: มีการแจ้งเตือนการจองใหม่ และในรายการรอรับแสดงชื่ออาหาร ลูกค้า เบอร์โทร รหัสรับ สถานะ “จองสำเร็จ” และยอดเงินของแต่ละรายการได้ถูกต้อง',
  'ผ่านบางส่วน',
  'ผู้ทดสอบ: เจ้าของร้าน | ยืนยันข้อมูลการจองในฝั่งร้านและการแจ้งเตือนแล้ว | ยังไม่มีหลักฐานหน้าจอรายการเดียวกันจากฝั่งลูกค้าและผู้ดูแลระบบ จึงยังยืนยันความตรงกันครบทั้ง 3 ฝั่งไม่ได้',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D17:L18', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 400,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D17:L18', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
