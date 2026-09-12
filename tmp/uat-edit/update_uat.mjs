import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = 'C:/Users/Admin/Downloads/G11_UAT.xlsx';
const outputDir = 'C:/SaveEats/outputs/uat_updated';
const outputPath = `${outputDir}/G11_UAT_updated.xlsx`;

await fs.mkdir(outputDir, { recursive: true });
const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J2:L4').values = [
  [
    'ทดสอบสมัครสมาชิกในแอปสำเร็จ สามารถกรอกข้อมูลและสมัครบัญชีลูกค้าได้จนจบ แล้วเข้าใช้งานได้',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | สมัครสมาชิกสำเร็จและเข้าใช้งานได้ | ยังไม่ได้ทดสอบกรอกอีเมลผิดรูปแบบและข้อความแจ้งเตือนภาษาไทย',
  ],
  [
    'ทดสอบเข้าสู่ระบบด้วยหมายเลขโทรศัพท์ในช่องเดียวกับอีเมลสำเร็จ และเข้าสู่บัญชีเดิมได้',
    'ผ่าน',
    'ผู้ทดสอบ: ลูกค้า | เข้าสู่ระบบด้วยเบอร์โทรศัพท์สำเร็จ | ยังไม่ได้ทดสอบความเข้าใจของผู้ใช้ว่าช่องนี้รองรับทั้งอีเมลและเบอร์โทร',
  ],
  [
    'ทดสอบตั้งรหัสผ่านใหม่สำเร็จ โดยใช้รหัสยืนยัน 6 หลักจาก Render logs แล้วระบบแสดงหน้าตั้งรหัสผ่านใหม่เรียบร้อย',
    'ผ่านบางส่วน',
    'ผู้ทดสอบ: ลูกค้า | ตั้งรหัสผ่านใหม่สำเร็จ | ข้อจำกัด: SMTP ยังไม่ตั้งค่า จึงไม่ได้รับรหัสทางอีเมล ต้องดูรหัสยืนยัน 6 หลักจาก Render logs | ยังไม่ได้ทดสอบว่ารหัสเดิมใช้เข้าสู่ระบบไม่ได้',
  ],
];

workbook.recalculate();

const check = await workbook.inspect({
  kind: 'table',
  sheetId: 'UAT',
  range: 'D1:L4',
  include: 'values,formulas',
  tableMaxRows: 4,
  tableMaxCols: 9,
  tableMaxCellChars: 300,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D1:L4', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
