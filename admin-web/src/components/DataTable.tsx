/**
 * ตารางข้อมูลมาตรฐาน
 *
 * ใช้ generic <T> เพื่อให้ TypeScript รู้ว่าแต่ละแถวเป็นข้อมูลชนิดอะไร
 * ตอนเขียน render: (row) => ... จะได้ autocomplete ของ field จริง
 * และถ้าพิมพ์ชื่อ field ผิดจะขึ้น error ทันที
 *
 * วิธีใช้
 *   <DataTable<StoreForAdmin>
 *     columns={[
 *       { key: 'store_name', title: 'ชื่อร้าน' },
 *       { key: 'status', title: 'สถานะ', render: (row) => <StatusBadge status={row.status} /> },
 *     ]}
 *     rows={stores}
 *     rowKey="store_id"
 *   />
 */
import type { ReactNode } from 'react';
import Icon from './Icon';

export interface Column<T> {
  /** ชื่อคอลัมน์ ใช้เป็น key ของ React ด้วย */
  key: string;
  /** หัวตาราง */
  title: string;
  /** ความกว้าง (ไม่ใส่ก็ได้) */
  width?: string;
  /** วิธีแสดงผล ถ้าไม่ใส่จะเอาค่าจาก row[key] มาแสดงตรง ๆ */
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  /** ชื่อ field ที่ใช้เป็น key ของแต่ละแถว เช่น 'store_id' */
  rowKey: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
}

export default function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'ยังไม่มีข้อมูล',
  emptyHint = '',
}: DataTableProps<T>): JSX.Element {
  if (loading) {
    return (
      <div className="table-wrap">
        <div className="loading-state">
          <div className="spinner" />
          <div>กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty-state">
          <div style={{ marginBottom: 8, color: 'var(--color-text-muted)' }}>
            <Icon name="leaf-outline" size={40} />
          </div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{emptyMessage}</div>
          {emptyHint ? <div className="text-small mt-md">{emptyHint}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap" style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width !== undefined ? { width: col.width } : undefined}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[rowKey])}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
