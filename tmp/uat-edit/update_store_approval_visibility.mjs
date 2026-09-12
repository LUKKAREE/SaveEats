import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J19:L19').values = [[
  'ทดสอบอนุมัติร้านสำเร็จ: หลังผู้ดูแลอนุมัติ ร้านทดสอบรออนุมัติเปลี่ยนเป็นสถานะ “อนุมัติแล้ว” พร้อมแจ้งเตือน และสร้างโพสต์ขายได้ จากนั้นโพสต์สาคูไส้ไก่ของร้านปรากฏในหน้าแรกและร้านปรากฏในแผนที่ฝั่งลูกค้า; กรณีไม่อนุมัติ ร้านได้รับข้อความแจ้งสาเหตุและยังลงขายไม่ได้',
  'ผ่าน',
  'ผู้ทดสอบ: ผู้ดูแลระบบ เจ้าของร้าน และลูกค้า | ยืนยันว่าร้านที่อนุมัติปรากฏให้ลูกค้าเห็นและขายได้ ส่วนร้านที่ไม่อนุมัติไม่สามารถลงขายได้ พร้อมเห็นเหตุผลที่ผู้ดูแลส่งกลับ',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D18:L19', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 440,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D18:L19', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
