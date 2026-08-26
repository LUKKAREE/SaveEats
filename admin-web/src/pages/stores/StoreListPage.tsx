/**
 * หน้ารายชื่อร้านค้าทั้งหมด (ใช้ได้จริงแล้ว)
 * กรองตามสถานะและค้นหาชื่อร้านได้
 */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StoreForAdmin, StoreStatus } from '@shared/index';
import { STORE_STATUS_LABEL } from '@shared/index';
import { readStatusParam } from '../../utils/urlFilter';
import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
import Icon from '../../components/Icon';

/** ตัวเลือกตัวกรองสถานะ สร้างจาก label กลางใน shared จะได้ไม่ต้องพิมพ์ซ้ำ */
const STATUS_FILTERS: Array<{ value: StoreStatus | ''; label: string }> = [
  { value: '', label: 'ทั้งหมด' },
  ...(Object.keys(STORE_STATUS_LABEL) as StoreStatus[]).map((value) => ({
    value,
    label: STORE_STATUS_LABEL[value],
  })),
];

export default function StoreListPage(): JSX.Element {
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<StoreForAdmin[]>([]);
  /* ตั้งค่าเริ่มต้นจาก URL เผื่อถูกส่งมาจากการ์ดในแดชบอร์ด เช่น /stores?status=approved */
  const [status, setStatus] = useState<StoreStatus | ''>(
    () => readStatusParam(searchParams, STORE_STATUS_LABEL)
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<StoreForAdmin | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getStores({ status, search, limit: 100 });
      setRows(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { void load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
    URL เปลี่ยนเมื่อไหร่ก็ตั้งตัวกรองตามใหม่
    จำเป็นตอนที่ผู้ใช้อยู่หน้านี้อยู่แล้ว แล้วกดการ์ดในแดชบอร์ดที่ชี้มาที่นี่อีกครั้ง
    React จะไม่สร้างคอมโพเนนต์ใหม่ ค่าตั้งต้นด้านบนจึงไม่ถูกอ่านซ้ำ
  */
  useEffect(() => {
    setStatus(readStatusParam(searchParams, STORE_STATUS_LABEL));
  }, [searchParams]);

  async function handleSuspend(reason: string): Promise<void> {
    if (!suspendTarget) return;
    setProcessing(true);
    try {
      await adminService.suspendStore(suspendTarget.store_id, reason);
      setSuspendTarget(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  const columns: Array<Column<StoreForAdmin>> = [
    {
      key: 'store_name',
      title: 'ชื่อร้าน',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.store_name}</div>
          <div className="text-small text-muted">{row.owner_email}</div>
        </div>
      ),
    },
    { key: 'status', title: 'สถานะ', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'rating',
      title: 'คะแนน',
      render: (row) =>
        Number(row.rating) > 0 ? (
          <span>
            <Icon name="star" size={12} color="var(--color-star)" />{' '}
            {Number(row.rating).toFixed(1)}{' '}
            <span className="text-muted text-small">({row.review_count})</span>
          </span>
        ) : (
          <span className="text-muted text-small">ยังไม่มีรีวิว</span>
        ),
    },
    {
      key: 'behavior_score',
      title: 'ความประพฤติ',
      render: (row) => {
        const score = row.behavior_score ?? 100;
        const color =
          score >= 70 ? 'var(--color-success)'
            : score >= 40 ? 'var(--color-warning-text)'
              : 'var(--color-error)';
        return <span style={{ color, fontWeight: 600 }}>{score}</span>;
      },
    },
    {
      key: 'actions',
      title: 'การจัดการ',
      render: (row) =>
        row.status === 'approved' ? (
          <button
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
            onClick={() => setSuspendTarget(row)}
          >
            ระงับร้าน
          </button>
        ) : (
          <span className="text-small text-muted">-</span>
        ),
    },
  ];

  function handleSearch(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void load();
  }

  return (
    <>
      <Header title="ร้านค้าทั้งหมด" subtitle="ดูและจัดการร้านค้าในระบบ" />

      {error ? <div className="alert alert-error"><Icon name="warning" size={18} /><span>{error}</span></div> : null}

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

          <form onSubmit={handleSearch} className="row" style={{ marginLeft: 'auto' }}>
            <input
              className="input"
              style={{ height: 36, width: 220 }}
              placeholder="ค้นหาชื่อร้านหรืออีเมล"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-outline btn-sm">ค้นหา</button>
          </form>
        </div>
      </div>

      <DataTable<StoreForAdmin>
        columns={columns}
        rows={rows}
        rowKey="store_id"
        loading={loading}
        emptyMessage="ไม่พบร้านค้า"
      />

      <ConfirmDialog
        open={suspendTarget !== null}
        title="ระงับร้านค้า"
        message={`ร้าน "${suspendTarget?.store_name ?? ''}" จะไม่สามารถลงขายได้จนกว่าจะปลดระงับ`}
        confirmLabel="ยืนยันระงับ"
        danger
        requireReason
        reasonLabel="เหตุผลที่ระงับ"
        loading={processing}
        onConfirm={(reason) => { void handleSuspend(reason); }}
        onCancel={() => setSuspendTarget(null)}
      />
    </>
  );
}
