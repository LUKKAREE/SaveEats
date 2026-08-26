/**
 * กราฟแท่งยอดจองย้อนหลัง 7 วัน
 *
 * *** วาดด้วย div ธรรมดา ไม่ได้ติดตั้งไลบรารีกราฟ ***
 * กราฟแท่งง่าย ๆ แบบนี้ใช้แค่ความสูงเป็นเปอร์เซ็นต์ก็พอ
 * การลง Chart.js หรือ Recharts เพื่อกราฟอันเดียว จะเพิ่มขนาดไฟล์เป็นร้อย KB
 * และต้องพึ่งเน็ตตอน npm install ซึ่งไม่คุ้มกันเลย
 *
 * *** ต้องได้ข้อมูลครบ 7 วันเสมอ รวมวันที่ยอดเป็น 0 ***
 * Backend เติมวันที่ขาดให้แล้ว (ดู fillMissingDays)
 * ถ้าข้ามวันที่ยอดศูนย์ กราฟจะดูเหมือนยอดคงที่ ทั้งที่จริงมีวันที่ไม่มีใครจองเลย
 */
import type { CSSProperties } from 'react';
import type { DailyCount } from '@shared/index';

interface DailyBarChartProps {
  data: DailyCount[];
}

const THAI_DAY = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export default function DailyBarChart({ data }: DailyBarChartProps): JSX.Element {
  /*
   * หาค่าสูงสุดไว้เทียบความสูงของแท่ง
   *
   * ใส่ Math.max(..., 1) กันหารด้วยศูนย์ ตอนที่ยังไม่มีการจองเลยสักวัน
   * ถ้าไม่กัน จะได้ NaN แล้วแท่งจะหายไปทั้งกราฟ
   */
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="card" style={styles.card}>
      <div style={styles.head}>
        <div>
          <div style={styles.title}>ยอดจอง 7 วันล่าสุด</div>
          <div style={styles.subtitle}>รวม {total.toLocaleString('th-TH')} รายการ</div>
        </div>
      </div>

      <div style={styles.chart}>
        {data.map((d) => {
          const date = new Date(`${d.date}T00:00:00`);
          const isToday = d.date === new Date().toISOString().slice(0, 10)
            || date.toDateString() === new Date().toDateString();
          const heightPct = (d.count / max) * 100;

          return (
            <div key={d.date} style={styles.col} title={`${d.date} : ${d.count} รายการ`}>
              {/* ตัวเลขบนหัวแท่ง ผู้ดูจะได้ไม่ต้องกะเอาจากความสูง */}
              <div style={{ ...styles.count, opacity: d.count > 0 ? 1 : 0.35 }}>{d.count}</div>

              <div style={styles.track}>
                <div
                  style={{
                    ...styles.bar,
                    /*
                     * ขั้นต่ำ 3% เพื่อให้วันที่ยอดเป็น 0 ยังมีขีดบาง ๆ ให้เห็น
                     * ถ้าปล่อยเป็น 0% แท่งจะหายไปเลย ดูเหมือนกราฟมีรูโหว่
                     */
                    height: `${Math.max(heightPct, 3)}%`,
                    background: isToday
                      ? 'var(--color-primary-dark)'
                      : d.count > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                  }}
                />
              </div>

              <div style={{ ...styles.day, fontWeight: isToday ? 700 : 500 }}>
                {THAI_DAY[date.getDay()]}
              </div>
              <div style={styles.date}>{date.getDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: { padding: 'var(--space-md, 16px)' },
  head: { marginBottom: 18 },
  title: { fontSize: 15, fontWeight: 600 },
  subtitle: { fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 },

  chart: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 168 },
  col: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  count: { fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-secondary)' },

  // กล่องครอบแท่ง สูงเต็มพื้นที่ที่เหลือ แท่งข้างในจึงคิดเปอร์เซ็นต์จากตรงนี้ได้
  track: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' },
  bar: { width: '100%', borderRadius: '6px 6px 3px 3px', transition: 'height .25s ease' },

  day: { fontSize: 12, marginTop: 8, color: 'var(--color-text-secondary)' },
  date: { fontSize: 10.5, color: 'var(--color-text-muted)' },
};
