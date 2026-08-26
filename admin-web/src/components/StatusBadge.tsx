/**
 * ป้ายแสดงสถานะ
 * ใช้ค่าสีจาก theme.css (คลาส .badge-xxx) จะได้ตรงกับฝั่งแอปมือถือ
 *
 * ข้อความภาษาไทยดึงมาจาก shared/src/labels.ts
 * ทำให้แอปกับเว็บใช้คำเดียวกันเสมอ
 */
import {
  STORE_STATUS_LABEL, RESERVATION_STATUS_LABEL, POST_STATUS_LABEL,
  BEHAVIOR_STATUS_LABEL, REPORT_STATUS_LABEL,
} from '@shared/index';

/** รวมข้อความของทุกสถานะไว้ใน object เดียว เพื่อค้นหาได้ง่าย */
const ALL_LABELS: Record<string, string> = {
  ...STORE_STATUS_LABEL,
  ...RESERVATION_STATUS_LABEL,
  ...POST_STATUS_LABEL,
  ...BEHAVIOR_STATUS_LABEL,
  ...REPORT_STATUS_LABEL,
};

export default function StatusBadge({ status }: { status: string | null | undefined }): JSX.Element | null {
  if (!status) return null;
  return <span className={`badge badge-${status}`}>{ALL_LABELS[status] ?? status}</span>;
}
