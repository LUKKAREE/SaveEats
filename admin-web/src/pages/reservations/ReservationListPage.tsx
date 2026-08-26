/**
 * หน้าดูการจองทั้งหมด (ใช้ได้จริงแล้ว)
 *
 * Admin ใช้หน้านี้ดูภาพรวมว่ามีการจองเข้ามาเท่าไหร่ ใครรับของแล้วบ้าง
 * มีปุ่ม "ปิดการจองที่หมดอายุ" ไว้กดตอนอยากเคลียร์ของค้างทันที
 * (ปกติมี job ทำให้อัตโนมัติอยู่แล้ว ปุ่มนี้ไว้เร่งเวลาตอนทดสอบ)
 *
 * API : GET  /api/admin/reservations?status=
 *       POST /api/admin/maintenance/expire-reservations
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReservationDetail, ReservationStatus } from '@shared/index';
import { RESERVATION_STATUS_LABEL } from '@shared/index';
import { readStatusParam, isToday } from '../../utils/urlFilter';

import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage } from '../../services/apiClient';
import { formatPrice, formatPickupRange, formatDateTime } from '../../utils/format';
import Icon from '../../components/Icon';

const STATUS_FILTERS: Array<{ value: ReservationStatus | ''; label: string }> = [
  { value: '', label: 'ทั้งหมด' },
  ...(Object.keys(RESERVATION_STATUS_LABEL) as ReservationStatus[]).map((value) => ({
    value,
    label: RESERVATION_STATUS_LABEL[value],
  })),
];

export default function ReservationListPage(): JSX.Element {
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<ReservationDetail[]>([]);
  /* ตั้งค่าเริ่มต้นจาก URL เผื่อถูกส่งมาจากการ์ดในแดชบอร์ด */
  const [status, setStatus] = useState<ReservationStatus | ''>(
    () => readStatusParam(searchParams, RESERVATION_STATUS_LABEL)
  );
  /**
   * แสดงเฉพาะการจองที่เกิดขึ้นวันนี้ (มาจาก /reservations?today=1)
   *
   * *** ทำไมกรองที่ฝั่งเว็บ ไม่ได้ส่งไปให้ API กรอง ***
   * GET /api/admin/reservations ยังไม่รับเงื่อนไขวันที่ และหน้านี้ดึงมาแค่ 100 แถวล่าสุด
   * ซึ่งครอบคลุมการจองของวันนี้อยู่แล้วในระบบขนาดนี้
   * ถ้าวันหนึ่งมีการจองเกินร้อยรายการต่อวันจริง ค่อยย้ายไปกรองที่ SQL
   */
  const [todayOnly, setTodayOnly] = useState(() => searchParams.get('today') === '1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmExpire, setConfirmExpire] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getReservations({ status, limit: 100 });
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

  /*
    URL เปลี่ยนเมื่อไหร่ก็ตั้งตัวกรองตามใหม่
    จำเป็นตอนที่ผู้ใช้อยู่หน้านี้อยู่แล้ว แล้วกดการ์ดในแดชบอร์ดที่ชี้มาที่นี่อีกครั้ง
    React จะไม่สร้างคอมโพเนนต์ใหม่ ค่าตั้งต้นด้านบนจึงไม่ถูกอ่านซ้ำ
  */
  useEffect(() => {
    setStatus(readStatusParam(searchParams, RESERVATION_STATUS_LABEL));
    setTodayOnly(searchParams.get('today') === '1');
  }, [searchParams]);

  /** แถวที่จะแสดงจริง หลังหักตัวกรอง "เฉพาะวันนี้" ออกไปแล้ว */
  const visible = useMemo(
    () => (todayOnly ? rows.filter((r) => isToday(r.created_at)) : rows),
    [rows, todayOnly]
  );

  /*
    สรุปยอดด้านบน คำนวณจากข้อมูลที่โหลดมาแล้ว ไม่ต้องยิง API เพิ่ม

    ต้องนับจาก visible ไม่ใช่ rows ไม่งั้นตอนกรอง "เฉพาะวันนี้"
    ตารางจะโชว์ 1 รายการ แต่กล่องสรุปข้างบนยังบอกว่ามี 20 ซึ่งขัดกันเองต่อหน้าต่อตา
  */
  const summary = useMemo(() => {
    const completed = visible.filter((r) => r.status === 'completed');
    const revenue = completed.reduce((sum, r) => sum + Number(r.total_price), 0);
    return {
      total: visible.length,
      waiting: visible.filter((r) => r.status === 'confirmed' || r.status === 'waiting').length,
      completed: completed.length,
      revenue,
    };
  }, [visible]);

  async function handleExpire(): Promise<void> {
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminService.expireReservations();
      setSuccess(`ปิดการจองที่หมดอายุแล้ว ${String(res.data.count)} รายการ`);
      setConfirmExpire(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  const columns: Array<Column<ReservationDetail>> = [
    {
      key: 'reservation_id',
      title: 'รหัสจอง',
      width: '110px',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>#{row.reservation_id}</div>
          <div className="text-small text-muted">รหัสรับ {row.reservation_code}</div>
        </div>
      ),
    },
    {
      key: 'customer_name',
      title: 'ลูกค้า',
      render: (row) => (
        <div>
          <div>{row.customer_name}</div>
          {row.customer_phone !== null ? (
            <div className="text-small text-muted">{row.customer_phone}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'food_name',
      title: 'อาหาร / ร้าน',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {row.food_name} <span className="text-muted">x{row.quantity}</span>
          </div>
          <div className="text-small text-muted">{row.store_name}</div>
        </div>
      ),
    },
    {
      key: 'total_price',
      title: 'ยอดรวม',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          {formatPrice(row.total_price)}
        </span>
      ),
    },
    {
      key: 'pickup',
      title: 'ช่วงเวลารับ',
      render: (row) => (
        <div>
          <div className="text-small">{formatPickupRange(row.pickup_start, row.pickup_end)}</div>
          {row.completed_at !== null ? (
            <div className="text-small text-muted">รับแล้ว {formatDateTime(row.completed_at)}</div>
          ) : null}
        </div>
      ),
    },
    { key: 'status', title: 'สถานะ', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <>
      <Header
        title="การจอง"
        subtitle={todayOnly ? 'เฉพาะการจองที่เกิดขึ้นวันนี้' : 'ดูข้อมูลการจองทั้งหมด'}
        actions={
          <button className="btn btn-outline btn-sm" onClick={() => setConfirmExpire(true)}>
            ปิดการจองที่หมดอายุ
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

      {/* ---- สรุปตัวเลข ---- */}
      <div className="grid mb-md" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <SummaryBox label="การจองทั้งหมด" value={String(summary.total)} />
        <SummaryBox label="รอมารับ" value={String(summary.waiting)} color="var(--color-warning-text)" />
        <SummaryBox label="รับอาหารแล้ว" value={String(summary.completed)} color="var(--color-success)" />
        <SummaryBox label="ยอดขายที่ปิดจบ" value={formatPrice(summary.revenue)} color="var(--color-primary)" />
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

        {/*
          ป้ายบอกว่ากำลังกรองเฉพาะวันนี้อยู่ พร้อมปุ่มปิด
          ถ้ากรองแบบเงียบ ๆ ผู้ใช้จะนึกว่าระบบมีการจองแค่นี้จริง ๆ
          ตัวกรองที่มองไม่เห็นคือตัวกรองที่ทำให้คนเข้าใจข้อมูลผิด
        */}
        {todayOnly ? (
          <div
            className="row"
            style={{ alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}
          >
            <span className="text-small text-muted">กำลังแสดงเฉพาะการจองของวันนี้</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setTodayOnly(false)}>
              ดูทุกวัน
            </button>
          </div>
        ) : null}
      </div>

      <DataTable<ReservationDetail>
        columns={columns}
        rows={visible}
        rowKey="reservation_id"
        loading={loading}
        emptyMessage="ไม่พบการจอง"
        emptyHint={todayOnly ? 'วันนี้ยังไม่มีการจอง ลองกด "ดูทุกวัน"' : 'ลองเปลี่ยนตัวกรองสถานะดู'}
      />

      <ConfirmDialog
        open={confirmExpire}
        title="ปิดการจองที่หมดอายุ"
        message="ระบบจะเปลี่ยนสถานะการจองที่เลยเวลารับไปแล้วให้เป็น 'หมดอายุ' และคืนของกลับเข้าโพสต์"
        confirmLabel="ยืนยัน"
        loading={processing}
        onConfirm={() => {
          void handleExpire();
        }}
        onCancel={() => setConfirmExpire(false)}
      />
    </>
  );
}

/** กล่องตัวเลขสรุปเล็ก ๆ ด้านบนตาราง */
function SummaryBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}): JSX.Element {
  return (
    <div className="card" style={{ padding: 'var(--space-md)' }}>
      <div className="text-small text-muted">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
