/**
 * หน้าตรวจสอบโพสต์ขายอาหาร (ใช้ได้จริงแล้ว)
 *
 * Admin ใช้หน้านี้ดูว่าตอนนี้มีอะไรวางขายอยู่บ้าง ร้านไหนตั้งราคาแปลก ๆ ไหม
 * และซ่อนโพสต์ที่ไม่เหมาะสมออกจาก Feed ได้
 *
 * *** ซ่อน ไม่ใช่ลบ ***
 * ถ้าลบทิ้ง การจองที่ผูกกับโพสต์นี้จะหายตามไปด้วย (FK ตั้ง ON DELETE CASCADE)
 * เปลี่ยนสถานะเป็น hidden แทน โพสต์หายจาก Feed แต่ประวัติการจองยังอยู่ครบ
 *
 * API : GET /api/admin/posts
 *       PUT /api/admin/posts/:id/hide
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FeedItem, PostStatus } from '@shared/index';
import { POST_STATUS_LABEL } from '@shared/index';
import { readStatusParam } from '../../utils/urlFilter';

import Header from '../../components/Header';
import DataTable from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import { errorMessage, imageUrl } from '../../services/apiClient';
import { formatPrice, formatPickupRange } from '../../utils/format';
import Icon from '../../components/Icon';

/** ตัวกรองสถานะ สร้างจาก label กลางใน shared จะได้ไม่ต้องพิมพ์ชื่อสถานะซ้ำ */
const STATUS_FILTERS: Array<{ value: PostStatus | ''; label: string }> = [
  { value: '', label: 'ทั้งหมด' },
  ...(Object.keys(POST_STATUS_LABEL) as PostStatus[]).map((value) => ({
    value,
    label: POST_STATUS_LABEL[value],
  })),
];

export default function PostListPage(): JSX.Element {
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<FeedItem[]>([]);
  /* ตั้งค่าเริ่มต้นจาก URL เผื่อถูกส่งมาจากการ์ดในแดชบอร์ด เช่น /posts?status=active */
  const [status, setStatus] = useState<PostStatus | ''>(
    () => readStatusParam(searchParams, POST_STATUS_LABEL)
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  /** โพสต์ที่กำลังจะซ่อน หรือเอากลับมาแสดง (null = ยังไม่ได้กดอะไร) */
  const [pending, setPending] = useState<{ row: FeedItem; hide: boolean } | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getPosts({ limit: 100 });
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

  /*
    URL เปลี่ยนเมื่อไหร่ก็ตั้งตัวกรองตามใหม่
    จำเป็นตอนที่ผู้ใช้อยู่หน้านี้อยู่แล้ว แล้วกดการ์ดในแดชบอร์ดที่ชี้มาที่นี่อีกครั้ง
    React จะไม่สร้างคอมโพเนนต์ใหม่ ค่าตั้งต้นด้านบนจึงไม่ถูกอ่านซ้ำ
  */
  useEffect(() => {
    setStatus(readStatusParam(searchParams, POST_STATUS_LABEL));
  }, [searchParams]);

  async function applyHide(): Promise<void> {
    if (pending === null) return;
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      await adminService.setPostHidden(pending.row.post_id, pending.hide);
      setSuccess(
        pending.hide
          ? `ซ่อนโพสต์ "${pending.row.food_name}" แล้ว ร้านจะได้รับการแจ้งเตือน`
          : `เอาโพสต์ "${pending.row.food_name}" กลับมาแสดงแล้ว`
      );
      setPending(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  /**
   * กรองในฝั่งเว็บ ไม่ได้ส่งไปกรองที่ Backend
   * เพราะ GET /api/admin/posts ยังไม่รับ parameter status กับ search
   * จำนวนโพสต์ในระบบระดับนี้กรองในเบราว์เซอร์ได้สบาย ไม่ช้า
   */
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== '' && row.status !== status) return false;
      if (keyword === '') return true;
      return (
        row.food_name.toLowerCase().includes(keyword) ||
        row.store_name.toLowerCase().includes(keyword)
      );
    });
  }, [rows, status, search]);

  const columns: Array<Column<FeedItem>> = [
    {
      key: 'food_name',
      title: 'อาหาร',
      render: (row) => {
        const uri = imageUrl(row.image, 'food');
        return (
          <div className="row">
            {uri !== null ? (
              <img src={uri} alt={row.food_name} style={thumbStyle} />
            ) : (
              <div style={{ ...thumbStyle, ...thumbEmptyStyle }}><Icon name="fast-food" size={22} /></div>
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{row.food_name}</div>
              <div className="text-small text-muted">{row.category_name ?? 'ไม่ระบุหมวด'}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'store_name',
      title: 'ร้าน',
      render: (row) => (
        <div>
          <div>{row.store_name}</div>
          {Number(row.store_rating) > 0 ? (
            <div className="text-small text-muted">
            <Icon name="star" size={12} color="var(--color-star)" />{' '}
            {Number(row.store_rating).toFixed(1)}
          </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'discount_price',
      title: 'ราคา',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            {formatPrice(row.discount_price)}
          </div>
          <div className="text-small text-muted" style={{ textDecoration: 'line-through' }}>
            {formatPrice(row.normal_price)}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity_left',
      title: 'คงเหลือ',
      render: (row) => {
        const left = row.quantity_left;
        const total = row.quantity_total;
        // เหลือน้อยกว่า 20% ให้ขึ้นสีส้ม จะได้สังเกตเห็น
        const low = total > 0 && left / total <= 0.2;
        return (
          <span style={{ fontWeight: 600, color: low ? 'var(--color-warning-text)' : undefined }}>
            {left} / {total}
          </span>
        );
      },
    },
    {
      key: 'pickup',
      title: 'ช่วงเวลารับ',
      render: (row) => (
        <span className="text-small">{formatPickupRange(row.pickup_start, row.pickup_end)}</span>
      ),
    },
    { key: 'status', title: 'สถานะ', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      title: 'การจัดการ',
      width: '150px',
      render: (row) => {
        // ซ่อนได้เฉพาะโพสต์ที่กำลังขาย / เอากลับมาได้เฉพาะที่ซ่อนอยู่
        if (row.status === 'active') {
          return (
            <button
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              onClick={() => setPending({ row, hide: true })}
            >
              ซ่อนโพสต์
            </button>
          );
        }
        if (row.status === 'hidden') {
          return (
            <button className="btn btn-outline btn-sm" onClick={() => setPending({ row, hide: false })}>
              เอากลับมาแสดง
            </button>
          );
        }
        return <span className="text-small text-muted">-</span>;
      },
    },
  ];

  return (
    <>
      <Header
        title="ตรวจสอบโพสต์"
        subtitle="ดูโพสต์ขายอาหารทั้งหมดในระบบ"
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

          <input
            className="input"
            style={{ height: 36, width: 240, marginLeft: 'auto' }}
            placeholder="ค้นหาชื่ออาหารหรือชื่อร้าน"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="text-small text-muted mt-md">
          แสดง {filtered.length} จากทั้งหมด {rows.length} โพสต์
        </div>
      </div>

      <DataTable<FeedItem>
        columns={columns}
        rows={filtered}
        rowKey="post_id"
        loading={loading}
        emptyMessage="ไม่พบโพสต์"
        emptyHint="ลองเปลี่ยนตัวกรอง หรือรอให้ร้านค้าลงขายก่อน"
      />

      <ConfirmDialog
        open={pending !== null}
        title={pending?.hide === true ? 'ซ่อนโพสต์นี้' : 'เอาโพสต์กลับมาแสดง'}
        message={
          pending === null
            ? ''
            : pending.hide
              ? `โพสต์ "${pending.row.food_name}" จะหายจาก Feed ของลูกค้าทันที การจองที่มีอยู่แล้วไม่ได้รับผลกระทบ และร้านจะได้รับการแจ้งเตือน`
              : `โพสต์ "${pending.row.food_name}" จะกลับมาแสดงใน Feed อีกครั้ง`
        }
        confirmLabel="ยืนยัน"
        danger={pending?.hide === true}
        loading={processing}
        onConfirm={() => { void applyHide(); }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

const thumbStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 'var(--radius-md)',
  objectFit: 'cover',
  background: 'var(--color-surface-alt)',
  flexShrink: 0,
};

const thumbEmptyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
};
