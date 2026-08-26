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
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
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

  async function applyChange(note: string): Promise<void> {
    if (pending === null) return;
    setProcessing(true);
    try {
      await adminService.updateReport(
        pending.report.report_id,
        pending.next,
        note.trim() === '' ? undefined : note
      );
      setPending(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

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
          {row.admin_note !== null ? (
            <div className="text-small text-muted mt-md">บันทึกผู้ดูแล : {row.admin_note}</div>
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
        // เรื่องที่ปิดไปแล้วไม่ต้องมีปุ่ม
        if (row.status === 'resolved' || row.status === 'rejected') {
          return <span className="text-small text-muted">ปิดเรื่องแล้ว</span>;
        }

        return (
          <div className="row" style={{ flexWrap: 'wrap' }}>
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
        reasonLabel="บันทึกของผู้ดูแล"
        reasonPlaceholder="เช่น ติดต่อร้านแล้ว ร้านยืนยันว่าจะไม่เกิดขึ้นอีก"
        loading={processing}
        onConfirm={(note) => {
          void applyChange(note);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
