/**
 * หน้าจัดการลูกค้า (ใช้ได้จริงแล้ว)
 * ดูรายชื่อ ค้นหา และเปิด/ปิดการใช้งานบัญชี
 */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { User } from '@shared/index';
import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
import Icon from '../../components/Icon';

export default function CustomerListPage(): JSX.Element {
  const [rows, setRows] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<User | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getCustomers({ search, limit: 100 });
      setRows(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(): Promise<void> {
    if (!target) return;
    setProcessing(true);
    try {
      await adminService.setUserActive(target.user_id, target.is_active === 0);
      setTarget(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  const columns: Array<Column<User>> = [
    { key: 'name', title: 'ชื่อ' },
    { key: 'email', title: 'อีเมล' },
    { key: 'phone', title: 'เบอร์โทร', render: (row) => row.phone ?? '-' },
    {
      key: 'created_at',
      title: 'สมัครเมื่อ',
      render: (row) => new Date(row.created_at.replace(' ', 'T')).toLocaleDateString('th-TH'),
    },
    {
      key: 'is_active',
      title: 'สถานะ',
      render: (row) => (
        <span className={`badge ${row.is_active ? 'badge-approved' : 'badge-suspended'}`}>
          {row.is_active ? 'ใช้งานอยู่' : 'ถูกระงับ'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'การจัดการ',
      render: (row) => (
        <button
          className="btn btn-outline btn-sm"
          style={row.is_active ? { color: 'var(--color-error)', borderColor: 'var(--color-error)' } : undefined}
          onClick={() => setTarget(row)}
        >
          {row.is_active ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
        </button>
      ),
    },
  ];

  function handleSearch(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void load();
  }

  return (
    <>
      <Header title="ลูกค้า" subtitle="จัดการบัญชีผู้ใช้ฝั่งลูกค้า" />

      {error ? <div className="alert alert-error"><Icon name="warning" size={18} /><span>{error}</span></div> : null}

      <form onSubmit={handleSearch} className="row mb-md">
        <input
          className="input"
          style={{ maxWidth: 300 }}
          placeholder="ค้นหาชื่อหรืออีเมล"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">ค้นหา</button>
      </form>

      <DataTable<User>
        columns={columns}
        rows={rows}
        rowKey="user_id"
        loading={loading}
        emptyMessage="ไม่พบลูกค้า"
      />

      <ConfirmDialog
        open={target !== null}
        title={target?.is_active ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี'}
        message={
          target?.is_active
            ? `${target.name} จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานใหม่`
            : `${target?.name ?? ''} จะกลับมาใช้งานได้ตามปกติ`
        }
        danger={target?.is_active === 1}
        loading={processing}
        onConfirm={() => { void handleToggle(); }}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
