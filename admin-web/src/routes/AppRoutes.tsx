/**
 * เส้นทางทั้งหมดของ Admin Web
 *
 * โครงสร้าง
 *   /login        เปิดได้โดยไม่ต้อง login
 *   ที่เหลือ      ต้อง login เป็น admin เท่านั้น (ครอบด้วย ProtectedRoute)
 *
 * *** ProtectedRoute เป็นแค่การกันฝั่งหน้าเว็บเพื่อ UX ***
 * ความปลอดภัยจริงอยู่ที่ Backend ซึ่งตรวจ requireAdmin ทุก endpoint (กฎเหล็กข้อ 3)
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';

import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import PendingStoresPage from '../pages/stores/PendingStoresPage';
import StoreListPage from '../pages/stores/StoreListPage';
import CustomerListPage from '../pages/customers/CustomerListPage';
import PostListPage from '../pages/posts/PostListPage';
import ReservationListPage from '../pages/reservations/ReservationListPage';
import ReviewListPage from '../pages/reviews/ReviewListPage';
import ReportListPage from '../pages/reports/ReportListPage';
import BehaviorPage from '../pages/behavior/BehaviorPage';

/** ถ้ายังไม่ login ให้เด้งไปหน้า /login */
function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element | null {
  const { isLoggedIn, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="loading-state" style={{ paddingTop: '20vh' }}>
        <div className="spinner" />
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** ถ้า login แล้วเข้าหน้า /login ให้เด้งไปแดชบอร์ด */
function PublicOnlyRoute({ children }: { children: ReactNode }): JSX.Element | null {
  const { isLoggedIn, initializing } = useAuth();
  if (initializing) return null;
  if (isLoggedIn) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

      <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stores/pending" element={<PendingStoresPage />} />
        <Route path="/stores" element={<StoreListPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/posts" element={<PostListPage />} />
        <Route path="/reservations" element={<ReservationListPage />} />
        <Route path="/reviews" element={<ReviewListPage />} />
        <Route path="/reports" element={<ReportListPage />} />
        <Route path="/behavior" element={<BehaviorPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
