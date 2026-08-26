import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** โฟลเดอร์ shared อยู่ระดับเดียวกับ admin-web (ขึ้นไป 1 ชั้น) */
const sharedDir = path.resolve(__dirname, '../shared/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ทำให้ import ... from '@shared/index' ใช้งานได้
      '@shared': sharedDir,
    },
  },
  server: {
    port: 5173,
    // host: true = ให้เครื่องอื่นในวง Wi-Fi เดียวกันเปิดเว็บนี้ได้ด้วย
    host: true,
    fs: {
      // อนุญาตให้ Vite อ่านไฟล์นอกโฟลเดอร์ admin-web ได้ (เพราะ shared อยู่ข้างนอก)
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
