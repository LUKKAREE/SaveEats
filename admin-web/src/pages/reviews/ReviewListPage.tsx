/**
 * หน้าดูรีวิวทั้งหมด (ใช้ได้จริงแล้ว)
 *
 * Admin ใช้หน้านี้หา "รีวิวแย่" ให้เจอเร็วที่สุด
 * รีวิว 1-2 ดาวจะขึ้นพื้นแดงอ่อน และมีปุ่มกรอง "เฉพาะรีวิวแย่" ไว้ให้
 *
 * ลบรีวิวที่ไม่เหมาะสมได้ (คำหยาบ / สแปม / กลั่นแกล้งร้าน)
 * เมื่อลบแล้ว Backend จะคำนวณคะแนนเฉลี่ยของร้านใหม่ให้อัตโนมัติ
 *
 * API : GET    /api/admin/reviews
 *       DELETE /api/admin/reviews/:id
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Review } from '@shared/index';

import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
import { formatDate, formatStars } from '../../utils/format';
import Icon from '../../components/Icon';

/** ตัวกรอง : ดูทั้งหมด / เฉพาะรีวิวแย่ (1-2 ดาว) / เฉพาะรีวิวดี (4-5 ดาว) */
type ReviewFilter = 'all' | 'bad' | 'good';

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'bad', label: 'รีวิวแย่ (1-2 ดาว)' },
  { value: 'good', label: 'รีวิวดี (4-5 ดาว)' },
];

export default function ReviewListPage(): JSX.Element {
  const [rows, setRows] = useState<Review[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  /** รีวิวที่กำลังจะลบ (null = ยังไม่ได้กดลบอะไร) */
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getReviews({ limit: 100 });
      setRows(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(): Promise<void> {
    if (deleteTarget === null) return;
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      await adminService.deleteReview(deleteTarget.review_id);
      setSuccess(`ลบรีวิวเรียบร้อยแล้ว และคำนวณคะแนนของร้าน "${deleteTarget.store_name ?? ''}" ใหม่แล้ว`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'bad') return rows.filter((r) => r.rating <= 2);
    if (filter === 'good') return rows.filter((r) => r.rating >= 4);
    return rows;
  }, [rows, filter]);

  /** คะแนนเฉลี่ยและจำนวนรีวิวแย่ ใช้โชว์ด้านบน */
  const summary = useMemo(() => {
    if (rows.length === 0) return { average: 0, bad: 0 };
    const sum = rows.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: sum / rows.length,
      bad: rows.filter((r) => r.rating <= 2).length,
    };
  }, [rows]);

  const columns: Array<Column<Review>> = [
    {
      key: 'rating',
      title: 'ดาว',
      width: '120px',
      render: (row) => (
        <span
          style={{
            fontSize: 16,
            letterSpacing: 1,
            color: row.rating <= 2 ? 'var(--color-error)' : 'var(--color-accent)',
          }}
        >
          {formatStars(row.rating)}
        </span>
      ),
    },
    {
      key: 'store_name',
      title: 'ร้าน',
      render: (row) => row.store_name ?? <span className="text-muted">-</span>,
    },
    {
      key: 'customer_name',
      title: 'ลูกค้า',
      render: (row) => (
        <span className="text-small">{row.customer_name ?? `ผู้ใช้ #${row.customer_id}`}</span>
      ),
    },
    {
      key: 'comment',
      title: 'ความคิดเห็น',
      render: (row) =>
        row.comment !== null && row.comment.trim() !== '' ? (
          <span>{row.comment}</span>
        ) : (
          <span className="text-muted text-small">ไม่ได้เขียนข้อความ</span>
        ),
    },
    {
      key: 'created_at',
      title: 'วันที่',
      width: '130px',
      render: (row) => <span className="text-small text-muted">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions',
      title: 'การจัดการ',
      width: '100px',
      render: (row) => (
        <button
          className="btn btn-outline btn-sm"
          style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          onClick={() => setDeleteTarget(row)}
        >
          ลบรีวิว
        </button>
      ),
    },
  ];

  return (
    <>
      <Header
        title="รีวิว"
        subtitle="ดูรีวิวทั้งหมดในระบบ"
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
      {success ? (
        <div className="alert alert-success">
          <Icon name="checkmark-circle" size={18} />
          <span>{success}</span>
        </div>
      ) : null}

      {summary.bad > 0 ? (
        <div className="alert alert-warning">
          <Icon name="warning" size={18} />
          <span>
            มีรีวิว 1-2 ดาวอยู่ {summary.bad} รายการ กดปุ่ม &quot;รีวิวแย่&quot; เพื่อดูเฉพาะรายการเหล่านี้
          </span>
        </div>
      ) : null}

      <div className="card mb-md" style={{ padding: 'var(--space-md)' }}>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}

          <div className="text-small text-muted" style={{ marginLeft: 'auto' }}>
            คะแนนเฉลี่ยทั้งระบบ{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              {summary.average.toFixed(2)}
            </strong>{' '}
            จาก {rows.length} รีวิว
          </div>
        </div>
      </div>

      <DataTable<Review>
        columns={columns}
        rows={filtered}
        rowKey="review_id"
        loading={loading}
        emptyMessage="ไม่พบรีวิว"
        emptyHint="รีวิวจะเกิดขึ้นหลังลูกค้ารับอาหารเรียบร้อยแล้ว"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="ลบรีวิวนี้"
        message={
          deleteTarget === null
            ? ''
            : `ลบรีวิว ${deleteTarget.rating} ดาว ของ "${deleteTarget.customer_name ?? 'ผู้ใช้'}" ` +
              'ที่มีต่อร้าน "' + (deleteTarget.store_name ?? '') + '" ' +
              'การลบย้อนกลับไม่ได้ และคะแนนเฉลี่ยของร้านจะถูกคำนวณใหม่'
        }
        confirmLabel="ยืนยันลบ"
        danger
        loading={processing}
        onConfirm={() => { void handleDelete(); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
