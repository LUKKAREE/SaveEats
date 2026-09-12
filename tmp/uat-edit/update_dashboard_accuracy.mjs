import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J20:L20').values = [[
  'ทดสอบตัวเลขแดชบอร์ดตรงกับข้อมูลจริง: แดชบอร์ดแสดงลูกค้า 4 คน ร้านค้าที่สมัคร 5 ร้าน โพสต์กำลังขาย 10 รายการ การจองทั้งหมด 15 รายการ รับอาหารแล้ว 8 รายการ และอาหารที่ถูกช่วยไว้ 9 ชุด มูลค่า 273 บาท ซึ่งสอดคล้องกับหน้าลูกค้า ร้านค้า โพสต์ และรายการจองที่กรองสถานะรับอาหารแล้ว; กราฟยอดจอง 7 วันแสดงวันที่ยอดเป็น 0 ครบ',
  'ผ่าน',
  'ผู้ทดสอบ: ผู้ดูแลระบบ | ตรวจสอบตัวเลขจากหน้ารายการข้อมูลจริงและหน้าการจองแล้วตรงกับการ์ดบนแดชบอร์ด รวมทั้งกราฟไม่ข้ามวันที่ยอดเป็นศูนย์',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D19:L20', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 460,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D19:L20', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
