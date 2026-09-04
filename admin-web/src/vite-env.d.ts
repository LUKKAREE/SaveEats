/**
 * บอก TypeScript ว่า import.meta.env มีหน้าตาอย่างไร
 *
 * *** ทำไมต้องมีไฟล์นี้ ***
 * import.meta.env เป็นของที่ Vite ใส่ให้ตอน build ไม่ใช่ของมาตรฐาน JavaScript
 * ถ้าไม่ประกาศไว้ TypeScript จะฟ้องว่า Property 'env' does not exist
 *
 * เพิ่มตัวแปรใหม่เมื่อไหร่ ให้มาเพิ่มชื่อในนี้ด้วย จะได้พิมพ์ผิดแล้วรู้ทันที
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ที่อยู่ของ Backend เช่น https://saveeats-api.onrender.com (ไม่ตั้งก็ใช้ localhost) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
