/**
 * เครื่องมือทดสอบโหลด — หลักฐานของ RQ-055 และ RQ-054
 *
 *   RQ-055  ระบบรองรับผู้ใช้งานพร้อมกันได้อย่างน้อย 50 คน
 *   RQ-054  API ต้องตอบกลับภายใน 2 วินาทีในสภาวะการใช้งานปกติ
 *
 * วิธีใช้
 *   cd C:\SaveEats\backend
 *   npm run loadtest                                   (ยิงเครื่องตัวเอง 50 คน 30 วินาที)
 *   npm run loadtest -- --url https://saveeats.onrender.com
 *   npm run loadtest -- --users 100 --seconds 60
 *
 * ผลลัพธ์ออก 2 ทาง
 *   1. พิมพ์บนจอ ดูได้ทันที
 *   2. เขียนไฟล์ Markdown ไว้ที่ docs/ เอาไปแนบ RTM หรือใส่ในรายงานได้เลย
 *
 * *** ทำไมต้องเขียนเอง ไม่ใช้ k6 หรือ JMeter ***
 * สองตัวนั้นต้องติดตั้งเพิ่มและเรียนวิธีเขียนสคริปต์ของมันอีกชุด
 * สิ่งที่ RTM ขอคือหลักฐานว่า "50 คนพร้อมกันแล้วระบบยังตอบไหว"
 * ซึ่งวัดได้ด้วย Node ล้วน ๆ ที่โปรเจกต์มีอยู่แล้ว และเพื่อนในทีมอ่านโค้ดนี้รู้เรื่อง
 *
 * *** ทำไมยิงเฉพาะเส้นทางที่ไม่ต้องล็อกอิน ***
 * ถ้าต้องล็อกอินก่อน จะต้องเอารหัสผ่านจริงมาใส่ในสคริปต์ แล้วมันจะหลุดขึ้น git
 * และเส้นทางที่ RQ-054 ระบุให้วัดคือหน้ารายการอาหารกับหน้าค้นหา
 * ซึ่งเป็นเส้นทางสาธารณะอยู่แล้ว (optionalAuth) จึงวัดได้ตรงตามที่เขียนไว้
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';

/** โฟลเดอร์ราก SaveEats (ขึ้นจาก backend\tools ไป 2 ชั้น) */
const ROOT = path.resolve(__dirname, '..', '..');

/** เกณฑ์ของ RQ-054 (มิลลิวินาที) */
const THRESHOLD_MS = 2000;

/**
 * สถานการณ์ที่จะยิง
 *
 * เลือกตามที่ RQ-054 เขียนไว้ว่า "วัดจากหน้ารายการอาหารและหน้าค้นหา
 * ซึ่งมีการอ่านข้อมูลมากที่สุด" แล้วเพิ่มอีก 2 เส้นทางเพื่อเทียบให้เห็นภาพ
 *   - รายชื่อร้าน : อ่านข้อมูลพร้อมคำนวณคะแนนเฉลี่ย
 *   - ตรวจสุขภาพฐานข้อมูล : เบาที่สุด ใช้เป็นเส้นฐานว่าเครือข่ายเองช้าเท่าไหร่
 */
interface Scenario {
  name: string;
  path: string;
}

const SCENARIOS: Scenario[] = [
  { name: 'หน้ารายการอาหาร (feed)', path: '/api/posts?limit=20' },
  { name: 'ค้นหาอาหาร', path: '/api/posts?search=%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%A7&limit=20' },
  { name: 'รายชื่อร้าน', path: '/api/stores?limit=20' },
  { name: 'ตรวจสุขภาพฐานข้อมูล', path: '/api/health/db' },
];

interface Sample {
  scenario: string;
  ms: number;
  ok: boolean;
  /** เหตุผลที่ไม่ผ่าน เช่น 'HTTP 500' หรือ 'timeout' */
  note: string;
}

/** อ่านค่าจาก argument เช่น --users 50 */
function readArg(name: string, fallback: string): string {
  const args = process.argv.slice(2);
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

/**
 * ยิง 1 คำขอแล้ววัดเวลา
 *
 * *** ทำไมต้องอ่านเนื้อหาตอบกลับให้หมดก่อนจับเวลาจบ ***
 * ถ้าจับเวลาตอนได้ header มา จะได้ตัวเลขที่สวยกว่าความจริง
 * เพราะผู้ใช้จริงต้องรอจนข้อมูลมาครบถึงจะเห็นหน้าจอ
 * และถ้าไม่อ่านให้จบ Node จะค้าง socket ไว้จนคำขอถัดไปต้องรอคิว
 */
function requestOnce(baseUrl: string, urlPath: string, timeoutMs: number): Promise<Sample> {
  return new Promise<Sample>((resolve) => {
    const full = new URL(urlPath, baseUrl);
    const client = full.protocol === 'https:' ? https : http;
    const startedAt = Date.now();

    const req = client.get(full, (res) => {
      res.on('data', () => { /* ทิ้งข้อมูล แค่ต้องอ่านให้จบ */ });
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        resolve({
          scenario: urlPath,
          ms: Date.now() - startedAt,
          ok: status >= 200 && status < 400,
          note: status >= 200 && status < 400 ? '' : `HTTP ${String(status)}`,
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({
        scenario: urlPath,
        ms: Date.now() - startedAt,
        ok: false,
        note: `เกิน ${String(timeoutMs)} ms`,
      });
    });

    req.on('error', (err: Error) => {
      resolve({
        scenario: urlPath,
        ms: Date.now() - startedAt,
        ok: false,
        note: err.message,
      });
    });
  });
}

/**
 * ค่าเปอร์เซ็นไทล์
 *
 * *** ทำไมต้องดู p95 ไม่ใช่ค่าเฉลี่ย ***
 * ค่าเฉลี่ยกลบคนที่รอนานทิ้ง ถ้า 95 คนได้ 0.1 วินาที แต่ 5 คนรอ 10 วินาที
 * ค่าเฉลี่ยจะออกมาราว 0.6 วินาที ซึ่งดูผ่านเกณฑ์สบาย
 * ทั้งที่มีคน 1 ใน 20 ที่ใช้งานไม่ได้จริง p95 จับกรณีแบบนี้ได้
 */
function percentile(sortedMs: number[], p: number): number {
  if (sortedMs.length === 0) return 0;
  const index = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[index] ?? 0;
}

interface Summary {
  name: string;
  count: number;
  failed: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  max: number;
}

function summarize(name: string, samples: Sample[]): Summary {
  const okMs = samples.filter((s) => s.ok).map((s) => s.ms).sort((a, b) => a - b);
  const total = okMs.reduce((sum, ms) => sum + ms, 0);
  return {
    name,
    count: samples.length,
    failed: samples.filter((s) => !s.ok).length,
    avg: okMs.length === 0 ? 0 : Math.round(total / okMs.length),
    p50: percentile(okMs, 50),
    p90: percentile(okMs, 90),
    p95: percentile(okMs, 95),
    max: okMs[okMs.length - 1] ?? 0,
  };
}

/** ผู้ใช้จำลอง 1 คน ยิงวนไปเรื่อย ๆ จนหมดเวลา */
async function virtualUser(
  baseUrl: string,
  userIndex: number,
  deadline: number,
  timeoutMs: number,
  collect: (scenarioName: string, sample: Sample) => void
): Promise<void> {
  let step = userIndex; // เริ่มคนละสถานการณ์ จะได้ไม่ยิงเส้นทางเดียวกันพร้อมกันทั้งหมด
  while (Date.now() < deadline) {
    const scenario = SCENARIOS[step % SCENARIOS.length];
    if (scenario === undefined) return;
    const sample = await requestOnce(baseUrl, scenario.path, timeoutMs);
    collect(scenario.name, sample);
    step += 1;
  }
}

function line(): void {
  console.log('-'.repeat(70));
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

async function main(): Promise<void> {
  const baseUrl = readArg('url', 'http://localhost:3000');
  const users = Number(readArg('users', '50'));
  const seconds = Number(readArg('seconds', '30'));
  const timeoutMs = Number(readArg('timeout', '20000'));

  /*
   * ตรวจค่าที่รับมาก่อนเริ่ม
   * ถ้าพิมพ์ผิดเป็น --users abc แล้วปล่อยผ่าน ค่าจะกลายเป็น NaN
   * แล้วโปรแกรมจะจบทันทีโดยไม่ยิงอะไรเลย แต่ยังพิมพ์รายงานว่า "ผ่าน" ออกมา
   * ซึ่งอันตรายกว่าการพังตรง ๆ เพราะเอาไปแนบรายงานได้ทั้งที่ไม่ได้ทดสอบจริง
   */
  if (!Number.isInteger(users) || users < 1) {
    console.error('!! --users ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
    process.exit(1);
  }
  if (!Number.isFinite(seconds) || seconds < 1) {
    console.error('!! --seconds ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป');
    process.exit(1);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    console.error('!! --timeout ต้องเป็นตัวเลขตั้งแต่ 1000 ขึ้นไป (มิลลิวินาที)');
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('   ทดสอบโหลด SaveEats  (RQ-055 : 50 คนพร้อมกัน · RQ-054 : ตอบใน 2 วินาที)');
  console.log('='.repeat(70));
  console.log(`   ปลายทาง        : ${baseUrl}`);
  console.log(`   ผู้ใช้พร้อมกัน  : ${String(users)} คน`);
  console.log(`   ระยะเวลา       : ${String(seconds)} วินาที`);
  line();

  /*
   * อุ่นเครื่องก่อน 1 คำขอ แล้ววัดแยกไว้ต่างหาก
   *
   * *** ทำไมต้องมีขั้นนี้ ***
   * Render แผนฟรีจะพักเครื่องเมื่อไม่มีคนใช้ คำขอแรกหลังตื่นใช้เวลาเป็นนาที
   * ถ้าเอาตัวเลขนั้นไปรวมกับผลทดสอบ ค่า p95 จะพังทั้งชุดเพราะคำขอเดียว
   * แต่ถ้าไม่รายงานเลยก็ไม่ซื่อสัตย์ เพราะผู้ใช้คนแรกของวันเจอแบบนี้จริง
   * จึงแยกรายงานเป็นคนละบรรทัด แล้วอธิบายให้ชัดว่าคืออะไร
   */
  console.log('   กำลังปลุกเครื่องปลายทาง...');
  const warmup = await requestOnce(baseUrl, '/api/health/db', 120000);
  console.log(
    `   คำขอแรก (cold start) : ${String(warmup.ms)} ms ` +
    `${warmup.ok ? '' : `(ไม่สำเร็จ : ${warmup.note})`}`
  );

  if (!warmup.ok) {
    console.error('');
    console.error('!! ต่อปลายทางไม่ได้ ยกเลิกการทดสอบ');
    console.error(`   ${warmup.note}`);
    console.error('   ถ้ายิงเครื่องตัวเอง ต้องเปิด npm run dev ค้างไว้ก่อน');
    process.exit(1);
  }

  line();
  console.log('   เริ่มยิงจริง...');

  const byScenario = new Map<string, Sample[]>();
  const collect = (scenarioName: string, sample: Sample): void => {
    const list = byScenario.get(scenarioName);
    if (list === undefined) byScenario.set(scenarioName, [sample]);
    else list.push(sample);
  };

  const startedAt = Date.now();
  const deadline = startedAt + seconds * 1000;

  /*
   * ปล่อยผู้ใช้จำลองทุกคนพร้อมกันด้วย Promise.all
   * ไม่ใช่ for-await ทีละคน ซึ่งจะกลายเป็นยิงเรียงกัน 1 คน ไม่ใช่ 50 คนพร้อมกัน
   */
  await Promise.all(
    Array.from({ length: users }, (_unused, i) =>
      virtualUser(baseUrl, i, deadline, timeoutMs, collect))
  );

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const all: Sample[] = [];
  for (const list of byScenario.values()) all.push(...list);

  const overall = summarize('ทุกเส้นทางรวมกัน', all);
  const perScenario = SCENARIOS
    .map((s) => summarize(s.name, byScenario.get(s.name) ?? []))
    .filter((s) => s.count > 0);

  const passed = overall.failed === 0 && overall.p95 <= THRESHOLD_MS;

  // ---------------------------------------------------------------- แสดงผล
  line();
  console.log(`   คำขอทั้งหมด : ${String(overall.count)} ครั้ง ใน ${elapsedSec.toFixed(1)} วินาที`);
  console.log(`   อัตราคำขอ   : ${(overall.count / elapsedSec).toFixed(1)} ครั้ง/วินาที`);
  console.log(`   ไม่สำเร็จ    : ${String(overall.failed)} ครั้ง`);
  line();
  console.log(`   ${pad('เส้นทาง', 28)}${pad('จำนวน', 8)}${pad('p50', 8)}${pad('p95', 8)}${pad('สูงสุด', 8)}`);
  for (const s of perScenario) {
    console.log(
      `   ${pad(s.name, 28)}${pad(String(s.count), 8)}` +
      `${pad(`${String(s.p50)} ms`, 8)}${pad(`${String(s.p95)} ms`, 8)}${pad(`${String(s.max)} ms`, 8)}`
    );
  }
  line();
  console.log(`   RQ-055 (${String(users)} คนพร้อมกัน ไม่มีคำขอล้มเหลว) : ${overall.failed === 0 ? 'ผ่าน' : 'ไม่ผ่าน'}`);
  console.log(`   RQ-054 (p95 ไม่เกิน ${String(THRESHOLD_MS)} ms)          : ${overall.p95 <= THRESHOLD_MS ? 'ผ่าน' : 'ไม่ผ่าน'} (p95 = ${String(overall.p95)} ms)`);
  line();

  // ---------------------------------------------------------------- เขียนรายงาน
  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear() + 543)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rows = perScenario
    .map((s) => `| ${s.name} | ${String(s.count)} | ${String(s.failed)} | ${String(s.avg)} | ${String(s.p50)} | ${String(s.p90)} | ${String(s.p95)} | ${String(s.max)} |`)
    .join('\n');

  const report = `# ผลทดสอบโหลด SaveEats (RQ-054 และ RQ-055)

> สร้างอัตโนมัติโดย \`backend/tools/loadTest.ts\` เมื่อ ${stamp}
> รันซ้ำได้ด้วย \`npm run loadtest -- --url ${baseUrl} --users ${String(users)} --seconds ${String(seconds)}\`

## เงื่อนไขการทดสอบ

| หัวข้อ | ค่า |
|---|---|
| ปลายทาง | \`${baseUrl}\` |
| ผู้ใช้จำลองพร้อมกัน | ${String(users)} คน |
| ระยะเวลา | ${elapsedSec.toFixed(1)} วินาที |
| คำขอทั้งหมด | ${String(overall.count)} ครั้ง |
| อัตราคำขอ | ${(overall.count / elapsedSec).toFixed(1)} ครั้ง/วินาที |
| คำขอที่ล้มเหลว | ${String(overall.failed)} ครั้ง |

## ผลแยกตามเส้นทาง (หน่วยเป็นมิลลิวินาที)

| เส้นทาง | จำนวน | ล้มเหลว | เฉลี่ย | p50 | p90 | p95 | สูงสุด |
|---|---|---|---|---|---|---|---|
${rows}
| **ทุกเส้นทางรวมกัน** | **${String(overall.count)}** | **${String(overall.failed)}** | **${String(overall.avg)}** | **${String(overall.p50)}** | **${String(overall.p90)}** | **${String(overall.p95)}** | **${String(overall.max)}** |

## สรุปเทียบกับข้อกำหนด

| ข้อ | เกณฑ์ | ผลที่วัดได้ | สรุป |
|---|---|---|---|
| RQ-055 | รองรับผู้ใช้พร้อมกันอย่างน้อย 50 คน | ยิงพร้อมกัน ${String(users)} คน ล้มเหลว ${String(overall.failed)} ครั้ง | ${overall.failed === 0 ? 'ผ่าน' : 'ไม่ผ่าน'} |
| RQ-054 | API ตอบกลับภายใน 2 วินาที | p95 = ${String(overall.p95)} ms | ${overall.p95 <= THRESHOLD_MS ? 'ผ่าน' : 'ไม่ผ่าน'} |

## เรื่องที่ต้องอ่านประกอบ ห้ามตัดทิ้ง

**คำขอแรกหลังเครื่องพัก (cold start) ใช้เวลา ${String(warmup.ms)} ms** และไม่ได้ถูกนับรวมในตารางข้างบน

Render แผนฟรีจะพักเครื่องเมื่อไม่มีคนใช้งานสักพัก คำขอแรกหลังตื่นจึงช้ากว่าปกติมาก
ตัวเลขนี้แยกออกมาเพราะไม่ใช่ "สภาวะการใช้งานปกติ" ตามที่ RQ-054 เขียนไว้
แต่ก็ต้องรายงานไว้ เพราะผู้ใช้คนแรกของวันเจอสถานการณ์นี้จริง

**สิ่งที่การทดสอบนี้วัด และไม่ได้วัด**

- วัด : เส้นทางอ่านข้อมูลที่ไม่ต้องล็อกอิน ซึ่งเป็นเส้นทางที่ RQ-054 ระบุให้วัด
- ไม่ได้วัด : การเขียนข้อมูล เช่น การจองพร้อมกัน ซึ่งมีชุดทดสอบแยกอยู่แล้ว (SIT-015)
- ผู้ใช้จำลองยิงคำขอถัดไปทันทีที่ได้คำตอบ ซึ่งหนักกว่าผู้ใช้จริงที่มีเวลาอ่านหน้าจอ
  ตัวเลขที่ได้จึงเป็นด้านที่แย่กว่าความจริง ไม่ใช่ด้านที่สวยกว่า
`;

  const outPath = path.join(ROOT, 'docs', 'ผลทดสอบโหลด-RQ054-RQ055.md');
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(`   เขียนรายงานไว้ที่ : ${outPath}`);
  console.log('');

  if (!passed) {
    console.log('   *** ยังไม่ผ่านเกณฑ์ อ่านรายงานเพื่อดูว่าเส้นทางไหนช้า ***');
    console.log('');
  }
}

main().catch((err: unknown) => {
  console.error('');
  console.error('!! ทดสอบโหลดไม่สำเร็จ');
  console.error(`   ${err instanceof Error ? err.message : String(err)}`);
  console.error('');
  process.exit(1);
});
