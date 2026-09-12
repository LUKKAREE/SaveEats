import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const outputPath = 'C:/SaveEats/outputs/uat_updated/G11_UAT_updated.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const sheet = workbook.worksheets.getItem('UAT');

sheet.getRange('J18:L18').values = [[
  'ทดสอบข้อมูลการจองตรงกันครบทั้งระบบ: ผู้ดูแลระบบแสดงรหัสจอง ลูกค้า อาหาร/ร้าน ยอดเงิน ช่วงเวลารับ และสถานะ “รับอาหารแล้ว” ตรงกับรายการจองในแอปลูกค้าหลายบัญชี รวมถึงรายการข้าวกะเพราหมูกรอบและน้ำลำไย',
  'ผ่าน',
  'ผู้ทดสอบ: ผู้ดูแลระบบและลูกค้าหลายบัญชี | ตรวจสอบข้อมูลการจองและสถานะ “รับอาหารแล้ว” ตรงกันระหว่างหน้าผู้ดูแลระบบกับแอปลูกค้า',
]];

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table', sheetId: 'UAT', range: 'D17:L18', include: 'values,formulas',
  tableMaxRows: 2, tableMaxCols: 9, tableMaxCellChars: 420,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan',
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT', range: 'D17:L18', scale: 1, format: 'png' });
console.log(`Rendered verification preview bytes: ${(await preview.arrayBuffer()).byteLength}`);
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
