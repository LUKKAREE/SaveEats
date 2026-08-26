/**
 * การคำนวณเกี่ยวกับพิกัดและระยะทาง
 *
 * *** กฎเหล็กข้อ 2 : Logic แบบนี้ต้องอยู่ที่ Backend เท่านั้น ***
 * ห้ามให้แอปมือถือคำนวณเองแล้วส่งผลมาให้ Backend เชื่อ
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * คำนวณระยะทางระหว่างพิกัด 2 จุด (สูตร Haversine) หน่วยเป็นกิโลเมตร
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * คำนวณกรอบสี่เหลี่ยม (bounding box) รอบจุดหนึ่ง
 * ใช้กรองข้อมูลใน SQL แบบหยาบ ๆ ก่อน (เร็วเพราะใช้ index ได้)
 * แล้วค่อยเอาผลลัพธ์มากรองละเอียดด้วย distanceKm อีกที
 */
export function boundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111; // 1 องศา latitude ประมาณ 111 กม.
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
