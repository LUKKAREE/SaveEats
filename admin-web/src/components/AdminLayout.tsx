/**
 * โครงหน้าหลักของ Admin Web
 * เมนูซ้าย + พื้นที่เนื้อหาขวา
 * ทุกหน้าที่ต้อง login จะถูกครอบด้วยตัวนี้ (ดูใน routes/AppRoutes.tsx)
 */
import { Outlet } from 'react-router-dom';
import type { CSSProperties } from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout(): JSX.Element {
  return (
    <div style={styles.wrapper}>
      <Sidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: 'flex', minHeight: '100vh', background: 'var(--color-background)' },
  main: { flex: 1, padding: 'var(--space-lg)', minWidth: 0 },
};
