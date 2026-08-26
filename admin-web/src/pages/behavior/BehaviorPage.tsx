/**
 * หน้าคะแนนความประพฤติของร้าน (ใช้ได้จริงแล้ว)
 *
 * *** ระบบคะแนนทำงานยังไง ***
 * ทุกร้านเริ่มที่ 100 คะแนน
 *   ส่งมอบอาหารสำเร็จ   +1
 *   ร้านยกเลิกการจอง    -5
 *   Admin ปรับเอง       ตามที่กรอก (หน้านี้)
 *
 * สถานะจะเปลี่ยนอัตโนมัติตามคะแนน
 *   70 ขึ้นไป  ปกติ
 *   40-69      ต้องจับตา
 *   ต่ำกว่า 40 ถูกระงับ (ลงขายไม่ได้)
 *
 * *** Backend เป็นคนคิดคะแนนและตัดสินสถานะ ไม่ใช่หน้าเว็บนี้ ***
 * หน้านี้แค่ส่งตัวเลขที่จะบวก/ลบไปให้ แล้วรอผลกลับมา
 *
 * API : GET /api/admin/behavior
 *       PUT /api/admin/behavior/:storeId
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BehaviorScoreForAdmin } from '@shared/index';
import { BEHAVIOR_STATUS_LABEL } from '@shared/index';

import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
import { formatDateTime } from '../../utils/format';
import Icon from '../../components/Icon';

/** ปุ่มปรับคะแนนสำเร็จรูป จะได้ไม่ต้องพิมพ์ตัวเลขเอง */
const QUICK_ADJUST: Array<{ change: number; label: string; danger: boolean }> = [
  { change: -10, label: '-10', danger: true },
  { change: -5, label: '-5', danger: true },
  { change: +5, label: '+5', danger: false },
  { change: +10, label: '+10', danger: false },
];

/** สีของตัวเลขคะแนน ใช้เกณฑ์เดียวกับที่ Backend ใช้ตัดสินสถานะ */
function scoreColor(score: number): string {
  if (score >= 70) return 'var(--color-success)';
  if (score >= 40) return 'var(--color-warning-text)';
  return 'var(--color-error)';
}

interface PendingAdjust {
  row: BehaviorScoreForAdmin;
  change: number;
}

export default function BehaviorPage(): JSX.Element {
  const [rows, setRows] = useState<BehaviorScoreForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState<PendingAdjust | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      setRows(await adminService.getBehaviorScores());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** นับร้านที่ต้องจับตาและร้านที่ถูกระงับ ไว้เตือนด้านบน */
  const summary = useMemo(
    () => ({
      warning: rows.filter((r) => r.status === 'warning').length,
      suspended: rows.filter((r) => r.status === 'suspended').length,
    }),
    [rows]
  );

  async function applyAdjust(reason: string): Promise<void> {
    if (pending === null) return;
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminService.adjustBehavior(
        pending.row.store_id,
        pending.change,
        reason.trim() === '' ? undefined : reason
      );
      const sign = pending.change > 0 ? '+' : '';
      setSuccess(
        `ปรับคะแนนร้าน "${pending.row.store_name}" ${sign}${String(pending.change)} แล้ว ` +
          `คะแนนใหม่คือ ${String(res.data.score)}`
      );
      setPending(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  const columns: Array<Column<BehaviorScoreForAdmin>> = [
    {
      key: 'store_name',
      title: 'ร้าน',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.store_name}</div>
          <div className="text-small text-muted">
            สถานะร้าน : <StatusBadge status={row.store_status} />
          </div>
        </div>
      ),
    },
    {
      key: 'score',
      title: 'คะแนน',
      width: '150px',
      render: (row) => (
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(row.score) }}>
            {row.score}
            <span className="text-small text-muted" style={{ fontWeight: 400 }}>
              {' '}
              / 100
            </span>
          </div>
          {/* แถบคะแนน ช่วยให้กวาดตาดูทั้งตารางแล้วเห็นร้านที่แย่ทันที */}
          <div style={barTrackStyle}>
            <div
              style={{
                ...barFillStyle,
                width: `${String(Math.max(0, Math.min(100, row.score)))}%`,
                background: scoreColor(row.score),
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'สถานะความประพฤติ',
      width: '150px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'reason',
      title: 'เหตุผลล่าสุด',
      render: (row) => (
        <div>
          <div className="text-small">{row.reason ?? '-'}</div>
          <div className="text-small text-muted">อัปเดต {formatDateTime(row.updated_at)}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'ปรับคะแนน',
      width: '220px',
      render: (row) => (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {QUICK_ADJUST.map((item) => (
            <button
              key={item.change}
              className="btn btn-outline btn-sm"
              style={
                item.danger
                  ? { color: 'var(--color-error)', borderColor: 'var(--color-error)' }
                  : { color: 'var(--color-success)', borderColor: 'var(--color-success)' }
              }
              onClick={() => setPending({ row, change: item.change })}
            >
              {item.label}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <Header
        title="คะแนนความประพฤติ"
        subtitle="ดูและปรับคะแนนความประพฤติของร้านค้า"
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

      {summary.suspended > 0 || summary.warning > 0 ? (
        <div className="alert alert-warning">
          <Icon name="warning" size={18} />
          <span>
            ตอนนี้มีร้านที่ต้องจับตา {summary.warning} ร้าน และถูกระงับจากคะแนน{' '}
            {summary.suspended} ร้าน
          </span>
        </div>
      ) : null}

      <div className="card mb-md" style={{ padding: 'var(--space-md)' }}>
        <div className="card-title">เกณฑ์การให้คะแนน</div>
        <div className="text-small text-muted">
          ทุกร้านเริ่มที่ 100 คะแนน · ส่งมอบอาหารสำเร็จ +1 · ร้านยกเลิกการจอง -5
        </div>
        <div className="text-small text-muted mt-md">
          70 ขึ้นไป = {BEHAVIOR_STATUS_LABEL.good} · 40-69 = {BEHAVIOR_STATUS_LABEL.warning} ·
          ต่ำกว่า 40 = {BEHAVIOR_STATUS_LABEL.suspended} (ลงขายไม่ได้)
        </div>
      </div>

      <DataTable<BehaviorScoreForAdmin>
        columns={columns}
        rows={rows}
        rowKey="store_id"
        loading={loading}
        emptyMessage="ยังไม่มีข้อมูลคะแนน"
        emptyHint="คะแนนจะถูกสร้างอัตโนมัติเมื่อมีร้านสมัครเข้ามา"
      />

      <ConfirmDialog
        open={pending !== null}
        title={
          pending !== null
            ? `${pending.change > 0 ? 'เพิ่ม' : 'หัก'}คะแนน ${String(Math.abs(pending.change))} คะแนน`
            : ''
        }
        message={
          pending !== null
            ? `ร้าน "${pending.row.store_name}" คะแนนปัจจุบัน ${String(pending.row.score)} ` +
              `จะกลายเป็น ${String(Math.max(0, Math.min(100, pending.row.score + pending.change)))}`
            : ''
        }
        confirmLabel="ยืนยัน"
        danger={(pending?.change ?? 0) < 0}
        requireReason
        reasonLabel="เหตุผลที่ปรับคะแนน"
        reasonPlaceholder="เช่น ตรวจสอบเรื่องร้องเรียนแล้วพบว่าร้านผิดจริง"
        loading={processing}
        onConfirm={(reason) => {
          void applyAdjust(reason);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

const barTrackStyle: React.CSSProperties = {
  height: 5,
  borderRadius: 3,
  background: 'var(--color-surface-alt)',
  marginTop: 4,
  overflow: 'hidden',
};

const barFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 3,
};
