import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J5:L7').values = [
  [
    'ทดสอบค้นหาอาหารและใช้ตัวกรองสำเร็จ พบผลลัพธ์ตรงกับคำค้น เช่น “น้ำ” และ “ขนม” เลือกหมวดหมู่เบเกอรี่ได้ และเรียงลำดับรายการได้',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | ค้นหาอาหารได้ตรงคำค้น ใช้ตัวกรองหมวดหมู่และตัวเลือกเรียงลำดับได้',
  ],
  [
    'ทดสอบค้นหาร้านตามระยะทางสำเร็จ: เลือกรัศมี 5 กม. พบ 2 ร้านที่ระยะ 730 ม. และ 3.7 กม. เมื่อเปลี่ยนเป็น 1 กม. เหลือเฉพาะร้านที่ระยะ 730 ม. ไม่มีร้านไกลเกินรัศมีปนมา',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | ระยะทางและการกรองตามรัศมี 1 กม. และ 5 กม. แสดงผลถูกต้อง',
  ],
  [
    'ทดสอบจองเค้กสำเร็จ: จำนวนคงเหลือลดจาก 7 ชุดเป็น 6 ชุดทันทีหลังจอง และหน้าจอแสดง QR Code กับรหัสรับอาหาร 4 หลัก',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | ยืนยันจำนวนอาหารลดลงทันทีหลังจอง พร้อมแสดง QR Code และรหัสรับอาหาร',
  ],
];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D4:L7', include: 'values,formulas',
  tableMaxRows: 4, tableMaxCols: 9, tableMaxCellChars: 330,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D4:L7', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
