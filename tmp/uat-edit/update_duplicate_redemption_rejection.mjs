import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J16:L16').values = [[
  'ทดสอบใช้รหัสรับอาหารซ้ำสำเร็จ: หลังรายการข้าวกะเพราหมูกรอบรหัส 4909 มีสถานะ “รับอาหารแล้ว” ร้านกรอกรหัสเดิมเพื่อยืนยันอีกครั้ง ระบบปฏิเสธและแสดงข้อความ “ยืนยันไม่สำเร็จ — ไม่พบการจองนี้ในระบบ”',
  'ผ่าน',
  'ผู้ทดสอบ: เจ้าของร้าน | ระบบป้องกันการยืนยันรับอาหารซ้ำด้วยรหัสเดิม และแสดงข้อความปฏิเสธชัดเจน',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D15:L16', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 360,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D15:L16', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
