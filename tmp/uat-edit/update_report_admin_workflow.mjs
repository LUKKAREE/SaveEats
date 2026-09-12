import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J21:L21').values = [[
  'ทดสอบแจ้งปัญหาสำเร็จ: ลูกค้าส่งเรื่องเกี่ยวกับร้านครัวคุณแม่พร้อมข้อความและรูปหลักฐาน ผู้ดูแลระบบเห็นเรื่อง ผู้แจ้ง เหตุผล เวลา และรูปครบทุกช่อง พร้อมตอบคุยกับผู้แจ้งได้; ตอนปิดเรื่อง ผู้ดูแลแยกบันทึกภายในออกจากข้อความถึงร้าน เลือกส่งเฉพาะข้อความถึงร้าน และร้านได้รับแจ้งเตือนผลการตรวจสอบ',
  'ผ่าน',
  'ผู้ทดสอบ: ลูกค้า ผู้ดูแลระบบ และเจ้าของร้าน | ยืนยันว่าข้อมูลเรื่องร้องเรียนและรูปไปถึงผู้ดูแลครบ ผู้แจ้งได้รับข้อความจากผู้ดูแล ร้านได้รับเฉพาะข้อความที่ตั้งใจส่งตอนจัดการเรื่องแล้ว โดยบันทึกภายในไม่ถูกส่งให้ร้าน',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D20:L21', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 480,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D20:L21', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
