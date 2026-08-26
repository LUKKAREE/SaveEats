/**
 * ตั้งค่า Babel ของแอปมือถือ
 *
 * *** ส่วนที่สำคัญคือ module-resolver ***
 * ทำให้เขียน  import ... from '@shared/index'  ได้
 * แทนที่จะต้องเขียน '../../../../shared/src/index'
 *
 * ค่า alias ตรงนี้ต้องตรงกับ paths ใน tsconfig.json เสมอ
 *   tsconfig  = ทำให้ TypeScript หาไฟล์เจอ (ตอนเขียนโค้ด)
 *   babel     = ทำให้ตัวแอปหาไฟล์เจอ (ตอนรันจริง)
 * ถ้าตั้งแค่อันเดียว จะขึ้น error ว่าหาโมดูลไม่เจอ
 *
 * ใช้ path.resolve เพื่อให้ได้ที่อยู่แบบเต็ม ไม่ขึ้นกับว่ารันคำสั่งจากโฟลเดอร์ไหน
 */
const path = require('node:path');

const sharedSrc = path.resolve(__dirname, '../shared/src');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@shared': sharedSrc,
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  };
};
