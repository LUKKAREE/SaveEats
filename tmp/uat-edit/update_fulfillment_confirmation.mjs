import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J15:L15').values = [[
  'ทดสอบร้านยืนยันการรับอาหารสำเร็จ: ร้านกรอกรหัส 4 หลัก 4909 ที่ลูกค้าแสดง แล้วระบบยืนยันสำเร็จ สถานะรายการข้าวกะเพราหมูกรอบเปลี่ยนเป็น “รับอาหารแล้ว” ทั้งหน้าร้านและหน้าการจองของลูกค้า',
  'ผ่าน',
  'ผู้ทดสอบ: เจ้าของร้านและลูกค้า | ยืนยันการรับอาหารด้วยรหัส 4 หลักสำเร็จ และตรวจพบสถานะตรงกันทั้งสองฝั่ง',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D14:L15', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 360,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D14:L15', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
