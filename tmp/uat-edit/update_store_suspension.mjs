import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J22:L22').values = [[
  'ทดสอบระงับร้านโดยผู้ดูแลสำเร็จ: ผู้ดูแลระงับร้านทดสอบรออนุมัติพร้อมระบุเหตุผล “ลอง” ร้านเปลี่ยนเป็นสถานะ “ถูกระงับ” และขึ้นข้อความว่ายังลงขายไม่ได้ โพสต์กำลังขายเป็น 0; ฝั่งลูกค้าค้นหาชื่อร้านแล้วไม่พบ และรายการอาหารของร้านไม่แสดง',
  'ผ่าน',
  'ผู้ทดสอบ: ผู้ดูแลระบบ เจ้าของร้าน และลูกค้า | ทดสอบการระงับโดยตรงแล้วร้านถูกซ่อนจากลูกค้าและขายไม่ได้ | ยังไม่ได้ทดสอบการสั่งระงับอัตโนมัติจากคะแนนความประพฤติต่ำกว่าเกณฑ์ และยังไม่ได้ทดสอบปลดระงับว่าข้อมูลเดิมคงอยู่ครบ',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D21:L22', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 480,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D21:L22', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
