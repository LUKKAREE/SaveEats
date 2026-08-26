/**
 * หน้าอนุมัติร้านค้า - งานหลักที่สำคัญที่สุดของ Admin
 * ใช้ได้จริงแล้ว
 *
 * ขั้นตอน
 *   1. ดึงร้านที่ status = pending
 *   2. Admin ดูข้อมูลร้านและเจ้าของร้าน
 *   3. กดอนุมัติ -> ร้านเปลี่ยนเป็น approved และร้านได้รับการแจ้งเตือน
 *      กดไม่อนุมัติ -> ต้องกรอกเหตุผล ร้านจะเห็นเหตุผลนั้นในแอป
 */
import { useCallback, useEffect, useState } from 'react';
import type { StoreForAdmin } from '@shared/index';
import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
import Icon from '../../components/Icon';

/** สิ่งที่กำลังจะทำกับร้านไหน */
interface DialogState {
  type: 'approve' | 'reject';
  store: StoreForAdmin;
}

export default function PendingStoresPage(): JSX.Element {
  const [rows, setRows] = useState<StoreForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getPendingStores({ limit: 100 });
      setRows(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleConfirm(reason: string): Promise<void> {
    if (!dialog) return;
    setProcessing(true);
    setError('');
    try {
      if (dialog.type === 'approve') {
        await adminService.approveStore(dialog.store.store_id);
        setSuccess(`อนุมัติร้าน "${dialog.store.store_name}" เรียบร้อยแล้ว`);
      } else {
        await adminService.rejectStore(dialog.store.store_id, reason);
        setSuccess(`บันทึกผลไม่อนุมัติร้าน "${dialog.store.store_name}" แล้ว`);
      }
      setDialog(null);
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  const columns: Array<Column<StoreForAdmin>> = [
    {
      key: 'store_name',
      title: 'ร้านค้า',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.store_name}</div>
          <div className="text-small text-muted">{row.description ?? 'ไม่มีคำอธิบาย'}</div>
        </div>
      ),
    },
    {
      key: 'owner',
      title: 'เจ้าของร้าน',
      render: (row) => (
        <div>
          <div>{row.owner_name}</div>
          <div className="text-small text-muted">{row.owner_email}</div>
          <div className="text-small text-muted">{row.owner_phone ?? 'ไม่ได้ระบุเบอร์'}</div>
        </div>
      ),
    },
    {
      key: 'address',
      title: 'ที่อยู่',
      render: (row) => (
        <div style={{ maxWidth: 260 }}>
          <div className="text-small">{row.address ?? 'ไม่ได้ระบุ'}</div>
          {row.latitude !== null ? (
            <a
              className="text-small"
              style={{ color: 'var(--color-primary)' }}
              href={`https://www.google.com/maps?q=${row.latitude},${row.longitude ?? 0}`}
              target="_blank"
              rel="noreferrer"
            >
              ดูตำแหน่งบนแผนที่
            </a>
          ) : (
            <div className="text-small" style={{ color: 'var(--color-warning-text)' }}>
              ยังไม่ได้ปักหมุดตำแหน่ง
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'วันที่สมัคร',
      render: (row) => (
        <span className="text-small">
          {new Date(row.created_at.replace(' ', 'T')).toLocaleDateString('th-TH')}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'การจัดการ',
      render: (row) => (
        <div className="row">
          <button className="btn btn-primary btn-sm" onClick={() => setDialog({ type: 'approve', store: row })}>
            อนุมัติ
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
            onClick={() => setDialog({ type: 'reject', store: row })}
          >
            ไม่อนุมัติ
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header
        title="ร้านค้ารออนุมัติ"
        subtitle="ตรวจสอบข้อมูลร้านก่อนอนุญาตให้เริ่มขาย"
        actions={<button className="btn btn-outline btn-sm" onClick={() => { void load(); }}>รีเฟรช</button>}
      />

      {success ? <div className="alert alert-success"><Icon name="checkmark-circle" size={18} /><span>{success}</span></div> : null}
      {error ? (
        <div className="alert alert-error">
          <Icon name="warning" size={18} /><span style={{ whiteSpace: 'pre-line' }}>{error}</span>
        </div>
      ) : null}

      <DataTable<StoreForAdmin>
        columns={columns}
        rows={rows}
        rowKey="store_id"
        loading={loading}
        emptyMessage="ไม่มีร้านค้ารออนุมัติ"
        emptyHint="ร้านที่สมัครใหม่จะปรากฏที่นี่โดยอัตโนมัติ"
      />

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.type === 'approve' ? 'อนุมัติร้านค้า' : 'ไม่อนุมัติร้านค้า'}
        message={
          dialog?.type === 'approve'
            ? `ร้าน "${dialog.store.store_name}" จะเริ่มลงขายอาหารได้ทันที`
            : `ร้าน "${dialog?.store.store_name ?? ''}" จะไม่สามารถขายได้ และจะเห็นเหตุผลที่คุณกรอก`
        }
        confirmLabel={dialog?.type === 'approve' ? 'อนุมัติ' : 'ยืนยันไม่อนุมัติ'}
        danger={dialog?.type === 'reject'}
        requireReason={dialog?.type === 'reject'}
        reasonLabel="เหตุผลที่ไม่อนุมัติ"
        reasonPlaceholder="เช่น ข้อมูลร้านไม่ครบ ยังไม่ได้ปักหมุดตำแหน่ง"
        loading={processing}
        onConfirm={(reason) => { void handleConfirm(reason); }}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
