/**
 * กราฟวงแหวนสัดส่วนสถานะการจอง
 *
 * ตอบคำถามสำคัญของโปรเจคนี้ว่า "จองแล้วไปรับจริงกี่เปอร์เซ็นต์"
 * ถ้าอัตราสำเร็จต่ำ แปลว่าอาหารยังถูกทิ้งอยู่ ทั้งที่มีคนจองแล้ว
 * ซึ่งเป็นปัญหาที่ต้องแก้ ไม่ใช่แค่ตัวเลขประดับ
 *
 * *** วาดด้วย SVG วงกลมวงเดียว ไม่ได้ใช้ไลบรารีกราฟ ***
 * เทคนิคคือวาดวงกลมทับกันหลายวง แต่ละวงใช้ stroke-dasharray
 * กำหนดว่า "ให้ลากเส้นยาวเท่าไหร่ แล้วเว้นเท่าไหร่" และ stroke-dashoffset
 * เลื่อนจุดเริ่มต้น ผลคือได้ส่วนโค้งของแต่ละสถานะเรียงต่อกันรอบวง
 */
import type { CSSProperties } from 'react';
import type { ReservationStatusCount, ReservationStatus } from '@shared/index';

interface StatusDonutProps {
  data: ReservationStatusCount[];
}

/** ลำดับการแสดงผล เรียงจากผลลัพธ์ที่ดีที่สุดไปแย่ที่สุด */
const ORDER: { status: ReservationStatus; label: string; color: string }[] = [
  { status: 'completed', label: 'รับอาหารแล้ว', color: 'var(--color-primary)' },
  { status: 'confirmed', label: 'รอไปรับ', color: '#60A5FA' },
  { status: 'waiting', label: 'รอร้านยืนยัน', color: '#FBBF24' },
  { status: 'expired', label: 'หมดเวลา', color: '#F97316' },
  { status: 'cancelled', label: 'ยกเลิก', color: '#DC2626' },
];

const SIZE = 132;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUM = 2 * Math.PI * RADIUS;

export default function StatusDonut({ data }: StatusDonutProps): JSX.Element {
  const counts = new Map(data.map((d) => [d.status, d.count]));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const slices = ORDER
    .map((s) => ({ ...s, count: counts.get(s.status) ?? 0 }))
    .filter((s) => s.count > 0);

  const completed = counts.get('completed') ?? 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // ระยะสะสม ใช้เลื่อนจุดเริ่มของแต่ละส่วนโค้งให้ต่อจากอันก่อนหน้าพอดี
  let offset = 0;

  return (
    <div className="card" style={styles.card}>
      <div style={styles.title}>สถานะการจองทั้งหมด</div>

      {total === 0 ? (
        <div style={styles.empty}>ยังไม่มีการจองในระบบ</div>
      ) : (
        <div style={styles.body}>
          <div style={styles.donutWrap}>
            <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
              {/* วงพื้นหลังสีเทา กันไม่ให้เห็นช่องว่างถ้าคำนวณคลาดไปเล็กน้อย */}
              <circle
                cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                fill="none" stroke="var(--color-surface-alt)" strokeWidth={STROKE}
              />
              {slices.map((s) => {
                const length = (s.count / total) * CIRCUM;
                const dash = `${length} ${CIRCUM - length}`;
                const thisOffset = -offset;
                offset += length;
                return (
                  <circle
                    key={s.status}
                    cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                    fill="none" stroke={s.color} strokeWidth={STROKE}
                    strokeDasharray={dash}
                    strokeDashoffset={thisOffset}
                  />
                );
              })}
            </svg>

            {/* ตัวเลขตรงกลางวง เป็นคำตอบที่คนอยากรู้ที่สุดจากกราฟนี้ */}
            <div style={styles.center}>
              <div style={styles.rate}>{successRate}%</div>
              <div style={styles.rateLabel}>สำเร็จ</div>
            </div>
          </div>

          <div style={styles.legend}>
            {slices.map((s) => (
              <div key={s.status} style={styles.legendRow}>
                <span style={{ ...styles.dot, background: s.color }} />
                <span style={styles.legendLabel}>{s.label}</span>
                <span style={styles.legendCount}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: { padding: 'var(--space-md, 16px)' },
  title: { fontSize: 15, fontWeight: 600, marginBottom: 18 },
  empty: { fontSize: 13.5, color: 'var(--color-text-muted)', padding: '24px 0', textAlign: 'center' },

  body: { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  donutWrap: { position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 },
  center: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  rate: { fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: 'var(--color-primary-dark)' },
  rateLabel: { fontSize: 11, color: 'var(--color-text-muted)' },

  legend: { flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 7 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, color: 'var(--color-text-secondary)' },
  legendCount: { fontWeight: 600 },
};
