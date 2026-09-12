import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J17:L17').values = [[
  'ทดสอบคิวหมดอายุและคืนของอัตโนมัติสำเร็จ: จองขนมปังไส้ทะลัก 2 ชุด จำนวนคงเหลือลดจาก 22 เหลือ 20 ชุด เมื่อเลยเวลารับ ระบบเปลี่ยนรายการเป็น “หมดอายุ” และคืนจำนวนคงเหลือกลับเป็น 22 ชุดอัตโนมัติ',
  'ผ่าน',
  'ผู้ทดสอบ: เจ้าของร้านและลูกค้า | ระบบคืนของหลังงานเบื้องหลังตรวจสอบคิวหมดอายุ (ใช้เวลาประมาณ 3–4 นาที) | ขณะหน้าจอขึ้น “คิวหมดเวลาแล้ว” ระบบยังอาจอยู่ระหว่างรอบตรวจสอบ จึงยังไม่คืนจำนวนทันที',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D16:L17', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 400,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D16:L17', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
