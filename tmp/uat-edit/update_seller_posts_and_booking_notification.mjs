import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J12:L13').values = [
  [
    'ทดสอบสร้างโพสต์ขายสำเร็จ: เพิ่มเมนูน้ำแตงโมปั่น ราคาเดิม 35 บาท ราคาขาย 18 บาท จำนวน 4 ชุด ระบบคำนวณส่วนลดอัตโนมัติเป็น 49% และโพสต์แสดงฝั่งลูกค้าพร้อมรูป ราคา และจำนวนคงเหลือ 4 ชุด',
    'ผ่าน',
    'ผู้ทดสอบ: เจ้าของร้าน | ระบบคำนวณส่วนลดจาก 35 เป็น 18 บาทได้ 49% และข้อมูลโพสต์ตรงกันทั้งฝั่งร้านและลูกค้า',
  ],
  [
    'ทดสอบแจ้งเตือนร้านเมื่อมีการจองใหม่สำเร็จ หลังลูกค้าจอง ระบบขึ้นจุดแดงบนกระดิ่งของร้าน และหน้าแจ้งเตือนแสดงข้อความ “มีการจองใหม่” พร้อมชื่ออาหาร',
    'ผ่าน',
    'ผู้ทดสอบ: เจ้าของร้าน | ร้านได้รับการแจ้งเตือนการจองใหม่และเปิดอ่านข้อความในหน้าการแจ้งเตือนได้',
  ],
];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D11:L13', include: 'values,formulas',
  tableMaxRows: 3, tableMaxCols: 9, tableMaxCellChars: 380,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D11:L13', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
