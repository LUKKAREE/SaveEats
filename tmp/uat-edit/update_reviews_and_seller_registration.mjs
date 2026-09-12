import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J10:L11').values = [
  [
    'ทดสอบรีวิวหลังรับอาหารสำเร็จ: รายการจองเค้กช็อกโกแลตแสดงสถานะ “รับอาหารแล้ว” จึงมีปุ่มเขียนรีวิว ส่งคะแนน 5 ดาวพร้อมข้อความ “อร่อยมากแม่” แล้วคะแนนเฉลี่ยร้านแสดง 5.0 จาก 1 รีวิว',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | เขียนรีวิวได้เฉพาะรายการที่รับอาหารแล้ว และคะแนน/ข้อความรีวิวปรากฏในหน้าร้าน | ยังไม่ได้ทดสอบการส่งรีวิวซ้ำของรายการเดิม',
  ],
  [
    'ทดสอบสมัครร้านค้าสำเร็จ ร้านขึ้นสถานะ “รออนุมัติ” พร้อมข้อความว่าผู้ดูแลระบบกำลังตรวจสอบ และมีการแจ้งเตือนว่าส่งคำขอเปิดร้านแล้ว',
    'ผ่าน',
    'ผู้ทดสอบ: เจ้าของร้าน | ยืนยันว่าร้านใหม่ปรากฏในหน้าร้านรออนุมัติของผู้ดูแลระบบ และร้านยังไม่สามารถลงขายได้ระหว่างรออนุมัติ',
  ],
];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D9:L11', include: 'values,formulas',
  tableMaxRows: 3, tableMaxCols: 9, tableMaxCellChars: 360,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D9:L11', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
