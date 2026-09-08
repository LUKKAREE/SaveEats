/**
 * หน้าจัดการเรื่องร้องเรียน (ใช้ได้จริงแล้ว)
 *
 * นี่คือหน้าที่ Admin ต้อง "ลงมือทำ" จริง ๆ ไม่ใช่แค่ดู
 * เส้นทางสถานะ :  รอตรวจสอบ -> กำลังตรวจสอบ -> จัดการแล้ว หรือ ปฏิเสธ
 *
 * ปุ่มที่กดได้จะเปลี่ยนไปตามสถานะปัจจุบัน เพื่อไม่ให้กดข้ามขั้น
 * ตอนกด "จัดการแล้ว" หรือ "ปฏิเสธ" จะบังคับให้กรอกบันทึกก่อน
 * เพราะเป็นการปิดเรื่อง ต้องมีหลักฐานว่าตัดสินใจเพราะอะไร
 *
 * API : GET /api/admin/reports?status=
 *       PUT /api/admin/reports/:id
 */
import { useCallback, useEffect, useState } from 'react';
import type { Report, ReportStatus, ReportTargetType } from '@shared/index';
import { REPORT_STATUS_LABEL } from '@shared/index';

import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ReportThreadDialog from './ReportThreadDialog';
import adminService from '../../services/adminService';
import { errorMessage, imageUrl } from '../../services/apiClient';
import { formatDateTime } from '../../utils/format';
import Icon from '../../components/Icon';

const STATUS_FILTERS: Array<{ value: ReportStatus | ''; label: string }> = [
  { value: '', label: 'ทั้งหมด' },
  ...(Object.keys(REPORT_STATUS_LABEL) as ReportStatus[]).map((value) => ({
    value,
    label: REPORT_STATUS_LABEL[value],
  })),
];

/**
 * ข้อความไทยของ target_type (ผู้ใช้แจ้งเรื่องอะไร)
 *
 * ประกาศเป็น Record<ReportTargetType, string> เพื่อบังคับให้ครบทุกค่า
 * ถ้ามีวันหนึ่งเพิ่มประเภทใหม่ใน shared/src/enums.ts แล้วลืมมาเพิ่มที่นี่
 * TypeScript จะฟ้องทันที ไม่ปล่อยให้ขึ้นเว็บเป็นช่องว่าง
 */
const TARGET_LABEL: Record<ReportTargetType, string> = {
  store: 'ร้านค้า',
  post: 'โพสต์',
  review: 'รีวิว',
  user: 'ผู้ใช้',
  reservation: 'การจอง',
};

/**
 * คะแนนที่จะถูกหักเมื่อผู้ดูแลยืนยันว่าร้านผิดจริง
 * ตัวเลขจริงกำหนดที่ backend (RULES.CONFIRMED_REPORT) ที่นี่ใช้แค่แสดงให้ผู้ดูแลอ่าน
 */
const PENALTY = -8;

/**
 * เรื่องแบบไหนที่ตัดคะแนนร้านได้
 * รีวิวเป็นของลูกค้า และการแจ้งผู้ใช้ก็ไม่เกี่ยวกับร้าน จึงตัดคะแนนร้านไม่ได้
 */
const PENALIZABLE_TARGETS: ReadonlyArray<Report['target_type']> = ['store', 'post', 'reservation'];

/** สิ่งที่กำลังจะเปลี่ยน เก็บไว้ระหว่างรอผู้ใช้ยืนยันใน dialog */
interface PendingChange {
  report: Report;
  next: ReportStatus;
}

export default function ReportListPage(): JSX.Element {
  const [rows, setRows] = useState<Report[]>([]);
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [processing, setProcessing] = useState(false);
  /** เรื่องที่กำลังเปิดดูรายละเอียดและห้องคุยอยู่ (null = ไม่ได้เปิด) */
  const [viewing, setViewing] = useState<Report | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getReports({ status, limit: 100 });
      setRows(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * @param note     บันทึกภายใน เห็นเฉพาะผู้ดูแล
   * @param message  ข้อความถึงเจ้าของสิ่งที่ถูกแจ้ง Backend จะยิงแจ้งเตือนให้
   *                 (ส่งไปก็ต่อเมื่อปิดเรื่องแบบ "จัดการแล้ว" เท่านั้น)
   * @param penalize ตัดคะแนนความประพฤติของร้านด้วยหรือไม่
   */
  async function applyChange(note: string, message: string, penalize: boolean): Promise<void> {
    if (pending === null) return;
    setProcessing(true);
    try {
      await adminService.updateReport(
        pending.report.report_id,
        pending.next,
        note.trim() === '' ? undefined : note,
        message.trim() === '' ? undefined : message,
        penalize
      );
      setPending(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  /** เรื่องที่ค้างอยู่ใน dialog ตัดคะแนนร้านได้หรือไม่ */
  const canPenalize =
    pending !== null && PENALIZABLE_TARGETS.includes(pending.report.target_type);

  const columns: Array<Column<Report>> = [
    {
      key: 'reporter_name',
      title: 'ผู้แจ้ง',
      render: (row) => (
        <div>
          <div>{row.reporter_name ?? `ผู้ใช้ #${row.reporter_id}`}</div>
          {row.reporter_email !== undefined ? (
            <div className="text-small text-muted">{row.reporter_email}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'target',
      title: 'เรื่องที่แจ้ง',
      width: '120px',
      render: (row) => (
        <span className="text-small">
          {TARGET_LABEL[row.target_type]} #{row.target_id}
        </span>
      ),
    },
    {
      key: 'reason',
      title: 'เหตุผล',
      render: (row) => (
        <div>
          <div>{row.reason}</div>

          {/* บอกให้เห็นตั้งแต่หน้ารายการว่าเรื่องไหนมีหลักฐานหรือมีคนคุยอยู่ */}
          <div className="row text-small text-muted mt-xs" style={{ gap: 10 }}>
            {imageUrl(row.image_url, 'report') !== null ? <span>มีรูปหลักฐาน</span> : null}
            {(row.message_count ?? 0) > 0 ? (
              <span>ข้อความ {row.message_count} รายการ</span>
            ) : null}
          </div>

          {row.admin_note !== null ? (
            <div className="text-small text-muted mt-md">บันทึกภายใน : {row.admin_note}</div>
          ) : null}
          {/*
            แยกสีให้เห็นชัดว่าข้อความนี้ "ส่งออกไปแล้ว" ไม่ใช่โน้ตภายใน
            ผู้ดูแลจะได้ไม่สับสนว่าอันไหนร้านอ่านได้บ้าง
          */}
          {row.resolution_message !== null ? (
            <div className="text-small mt-xs" style={{ color: 'var(--color-primary)' }}>
              ส่งถึงผู้ถูกแจ้ง : {row.resolution_message}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'แจ้งเมื่อ',
      width: '150px',
      render: (row) => <span className="text-small text-muted">{formatDateTime(row.created_at)}</span>,
    },
    { key: 'status', title: 'สถานะ', width: '120px', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      title: 'การจัดการ',
      width: '210px',
      render: (row) => {
        /*
         * ปุ่มดูรายละเอียดต้องมีทุกสถานะ รวมถึงเรื่องที่ปิดไปแล้ว
         * เพราะรูปหลักฐานและบทสนทนาคือหลักฐานว่าตัดสินใจเพราะอะไร
         * ถ้าเปิดดูย้อนหลังไม่ได้ การปิดเรื่องจะกลายเป็นกล่องดำที่ตรวจสอบไม่ได้
         */
        const detailButton = (
          <button className="btn btn-ghost btn-sm" onClick={() => setViewing(row)}>
            ดู / คุย
          </button>
        );

        if (row.status === 'resolved' || row.status === 'rejected') {
          return (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <span className="text-small text-muted">ปิดเรื่องแล้ว</span>
              {detailButton}
            </div>
          );
        }

        return (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {detailButton}
            {row.status === 'open' ? (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPending({ report: row, next: 'reviewing' })}
              >
                เริ่มตรวจสอบ
              </button>
            ) : null}

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setPending({ report: row, next: 'resolved' })}
            >
              จัดการแล้ว
            </button>

            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              onClick={() => setPending({ report: row, next: 'rejected' })}
            >
              ปฏิเสธ
            </button>
          </div>
        );
      },
    },
  ];

  // ปิดเรื่อง (resolved / rejected) ต้องบันทึกเหตุผลเสมอ
  const mustWriteNote = pending?.next === 'resolved' || pending?.next === 'rejected';

  return (
    <>
      <Header
        title="การแจ้งปัญหา"
        subtitle="จัดการเรื่องร้องเรียนจากผู้ใช้"
        actions={
          <button className="btn btn-outline btn-sm" onClick={() => void load()} disabled={loading}>
            รีเฟรช
          </button>
        }
      />

      {error ? (
        <div className="alert alert-error">
          <Icon name="warning" size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="alert alert-info">
        <Icon name="bulb" size={18} />
        <span>
          ถ้าตรวจแล้วพบว่าร้านผิดจริง อย่าลืมไปหักคะแนนความประพฤติของร้านที่หน้า
          &quot;คะแนนความประพฤติ&quot; ด้วย
        </span>
      </div>

      <div className="card mb-md" style={{ padding: 'var(--space-md)' }}>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`btn btn-sm ${status === filter.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable<Report>
        columns={columns}
        rows={rows}
        rowKey="report_id"
        loading={loading}
        emptyMessage="ไม่มีเรื่องร้องเรียน"
        emptyHint="ถือเป็นข่าวดี แปลว่าตอนนี้ยังไม่มีใครแจ้งปัญหาเข้ามา"
      />

      <ConfirmDialog
        open={pending !== null}
        title={`เปลี่ยนสถานะเป็น "${pending !== null ? REPORT_STATUS_LABEL[pending.next] : ''}"`}
        message={pending !== null ? `เรื่อง : ${pending.report.reason}` : ''}
        confirmLabel="ยืนยัน"
        danger={pending?.next === 'rejected'}
        requireReason={mustWriteNote}
        reasonLabel="บันทึกภายใน (ผู้ถูกแจ้งไม่เห็น)"
        reasonPlaceholder="เช่น ติดต่อร้านแล้ว ร้านยืนยันว่าจะไม่เกิดขึ้นอีก"
        showExtra={pending?.next === 'resolved'}
        extraLabel="ข้อความถึงผู้ถูกแจ้ง (ไม่กรอกก็ได้)"
        extraPlaceholder="เช่น ได้รับรายงานเรื่องคุณภาพอาหาร กรุณาตรวจสอบก่อนลงขายครั้งต่อไป"
        extraHint="ข้อความนี้จะถูกส่งเป็นการแจ้งเตือนถึงเจ้าของโดยตรง ห้ามระบุชื่อผู้แจ้ง"
        loading={processing}
        showCheckbox={pending?.next === 'resolved' && canPenalize}
        checkboxLabel={`ตัดคะแนนความประพฤติของร้าน ${String(PENALTY)} คะแนน`}
        checkboxHint="ติ๊กเมื่อตรวจแล้วพบว่าร้านผิดจริง ถ้าคะแนนตกต่ำกว่าเกณฑ์ ระบบจะระงับร้านให้อัตโนมัติ"
        onConfirm={(note, message, penalize) => {
          void applyChange(note, message, penalize);
        }}
        onCancel={() => setPending(null)}
      />

      <ReportThreadDialog
        report={viewing}
        onClose={() => setViewing(null)}
        // ส่งข้อความแล้วโหลดรายการใหม่ ตัวเลขจำนวนข้อความจะได้ตรงกับความจริง
        onSent={() => { void load(); }}
      />
    </>
  );
}
