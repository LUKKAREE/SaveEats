import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J8:L9').values = [
  [
    'ทดสอบการแจ้งเตือนใกล้หมดเวลารับอาหารสำเร็จ ระบบแสดงข้อความ “ใกล้หมดเวลารับอาหาร” และแจ้งว่าเหลืออีกประมาณ 11 นาที',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | พบการแจ้งเตือนใกล้หมดเวลารับอาหารในหน้าการแจ้งเตือน | ยังไม่ได้ทดสอบการแจ้งเตือนซ้ำหลายครั้ง',
  ],
  [
    'ทดสอบยกเลิกการจองสำเร็จ รายการน้ำลำไยแสดงสถานะ “ยกเลิก” และจำนวนคงเหลือกลับเข้าระบบจาก 5 ชุดเป็น 6 ชุด',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | ยกเลิกการจองสำเร็จ และตรวจพบจำนวนอาหารกลับเข้าระบบทันที',
  ],
];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D7:L9', include: 'values,formulas',
  tableMaxRows: 3, tableMaxCols: 9, tableMaxCellChars: 330,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D7:L9', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
