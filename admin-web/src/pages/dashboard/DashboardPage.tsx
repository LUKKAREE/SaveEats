/**
 * หน้าแดชบอร์ด - ภาพรวมของระบบ
 * ใช้ได้จริงแล้ว ดึงข้อมูลจาก GET /api/admin/dashboard
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats } from '@shared/index';
import Header from '../../components/Header';
import DashboardCard from '../../components/DashboardCard';
import Icon from '../../components/Icon';
import DailyBarChart from '../../components/DailyBarChart';
import StatusDonut from '../../components/StatusDonut';
import adminService from '../../services/adminService';
import { formatPrice } from '../../utils/format';
import { errorMessage } from '../../services/apiClient';

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      setStats(await adminService.getDashboard());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <>
        <Header title="แดชบอร์ด" />
        <div className="loading-state">
          <div className="spinner" />
          กำลังโหลดข้อมูล...
        </div>
      </>
    );
  }

  if (error !== '' || stats === null) {
    return (
      <>
        <Header title="แดชบอร์ด" />
        <div className="alert alert-error">
          <Icon name="warning" size={18} />
          <span style={{ whiteSpace: 'pre-line' }}>{error || 'โหลดข้อมูลไม่สำเร็จ'}</span>
        </div>
        <button className="btn btn-outline" onClick={() => { void load(); }}>ลองอีกครั้ง</button>
      </>
    );
  }

  return (
    <>
      <Header
        title="แดชบอร์ด"
        subtitle="ภาพรวมของระบบ SaveEats"
        actions={<button className="btn btn-outline btn-sm" onClick={() => { void load(); }}>รีเฟรช</button>}
      />

      {/* งานที่ต้องทำก่อน : ร้านรออนุมัติ */}
      {stats.pendingStores > 0 ? (
        <div className="alert alert-warning">
          <Icon name="hourglass" size={18} />
          <span>
            มีร้านค้ารออนุมัติอยู่ <strong>{stats.pendingStores}</strong> ร้าน{' '}
            <button
              className="btn btn-sm"
              style={{ color: 'var(--color-primary-dark)', textDecoration: 'underline', height: 'auto', padding: 0 }}
              onClick={() => navigate('/stores/pending')}
            >
              ไปตรวจสอบ
            </button>
          </span>
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/*
          *** การ์ดเป็นสีเขียวทั้งหมดโดยปกติ ***
          เดิมใช้สีคละกัน (เหลือง ฟ้า ส้ม เขียว) ซึ่งดูแล้วไม่เป็นชุดเดียวกัน
          และที่แย่กว่านั้นคือสีไม่ได้สื่ออะไรเลย ร้านรออนุมัติ 0 ร้าน
          ก็ยังเป็นสีเหลืองเตือน ทั้งที่ไม่มีอะไรต้องทำ

          ตอนนี้เขียว = ปกติ ส่วนสีเตือนจะโผล่มาก็ต่อเมื่อมีงานค้างจริง ๆ
          พอเห็นสีอื่นแทรกขึ้นมาเมื่อไหร่ ผู้ดูแลจะรู้ทันทีว่าต้องเข้าไปจัดการ
        */}
        {/*
          *** ทุกการ์ดกดได้ และพาไป "ของที่นับอยู่บนการ์ด" จริง ๆ ***
          เดิมกดได้แค่ 4 ใบจาก 8 ใบ ผู้ใช้ลองกดใบที่กดไม่ได้แล้วไม่มีอะไรเกิดขึ้น
          ก็จะเลิกกดทั้งหมด เพราะไม่รู้ว่าใบไหนกดได้ใบไหนกดไม่ได้

          และไม่ได้พาไปเฉย ๆ แต่ส่งตัวกรองไปกับ URL ด้วย (?status=...)
          กดการ์ด "โพสต์ที่กำลังขาย 5" แล้วต้องเห็น 5 อันนั้นเลย
          ไม่ใช่เห็นโพสต์ทั้งหมดแล้วต้องมานั่งหาเองว่าอันไหน
        */}
        <DashboardCard
          label="ร้านรออนุมัติ" value={stats.pendingStores} icon="hourglass"
          tone={stats.pendingStores > 0 ? 'warning' : 'primary'}
          onClick={() => navigate('/stores/pending')}
        />
        <DashboardCard
          label="ร้านที่เปิดขายอยู่" value={stats.approvedStores} icon="storefront" tone="primary"
          onClick={() => navigate('/stores?status=approved')}
        />
        <DashboardCard
          label="ลูกค้าทั้งหมด" value={stats.customers} icon="people" tone="primary"
          onClick={() => navigate('/customers')}
        />
        <DashboardCard
          label="ร้านค้าที่สมัคร" value={stats.sellers} icon="business" tone="primary"
          /*
            นับจากบัญชีที่สมัครเป็นร้าน ซึ่งรวมทุกสถานะ (รออนุมัติ / อนุมัติ / ถูกระงับ)
            จึงพาไปหน้าร้านค้าทั้งหมดโดยไม่กรองสถานะ ให้ตัวเลขตรงกับที่เห็นบนการ์ด
          */
          onClick={() => navigate('/stores')}
        />
        <DashboardCard
          label="โพสต์ที่กำลังขาย" value={stats.activePosts} icon="document-text" tone="primary"
          onClick={() => navigate('/posts?status=active')}
        />
        <DashboardCard
          label="การจองวันนี้" value={stats.todayReservations} icon="receipt" tone="primary"
          onClick={() => navigate('/reservations?today=1')}
        />
        <DashboardCard
          label="การจองทั้งหมด" value={stats.totalReservations} icon="trending-up" tone="primary"
          onClick={() => navigate('/reservations')}
        />
        <DashboardCard
          label="เรื่องร้องเรียนที่ยังไม่จัดการ" value={stats.openReports} icon="flag"
          tone={stats.openReports > 0 ? 'error' : 'primary'}
          onClick={() => navigate('/reports')}
        />

        {/*
          *** RQ-053 ปริมาณอาหารที่ช่วยไม่ให้กลายเป็นขยะ ***

          ตัวชี้วัดคุณค่าหลักของโครงงาน มาจากข้อเสนอของอาจารย์ที่ปรึกษา

          *** ทำไมหน่วยเป็น "ชุด" ไม่ใช่กิโลกรัม ***
          ร้านอาหารริมทางไม่มีตาชั่ง และฐานข้อมูลไม่มีคอลัมน์น้ำหนัก
          ถ้าจะแสดงเป็นกิโลกรัมต้องเดาน้ำหนักต่อชุดขึ้นมาเอง
          ซึ่งจะทำให้ตัวเลขนี้กลายเป็นของแต่งขึ้น ทั้งที่การ์ดใบอื่นบนหน้าเดียวกัน
          นับจากข้อมูลจริงทั้งหมด จึงเลือกแสดงสิ่งที่ตรวจสอบย้อนกลับได้จริงแทน

          *** ทำไมข้อความบนการ์ดเขียนว่า "ถูกรับไปแล้ว" ไม่ใช่ "ช่วยโลก N กก." ***
          เพื่อไม่เคลมเกินกว่าที่ข้อมูลรองรับ สิ่งที่ตัวเลขนี้ยืนยันได้จริง
          มีแค่ว่ามีอาหารกี่ชุดที่มีคนมารับไป แทนที่จะถูกทิ้ง

          ทั้งสองใบพาไปหน้าการจองที่กรอง completed ไว้แล้ว
          เพื่อให้กดแล้วเห็น "ของที่นับอยู่บนการ์ด" ตรง ๆ ตามกติกาของหน้านี้
        */}
        <DashboardCard
          label="อาหารที่ถูกรับไปแล้ว"
          value={`${stats.foodSavedCount.toLocaleString('th-TH')} ชุด`}
          icon="leaf" tone="primary"
          hint="นับเฉพาะรายการที่ร้านยืนยันส่งมอบ"
          onClick={() => navigate('/reservations?status=completed')}
        />
        <DashboardCard
          label="มูลค่าอาหารที่ไม่ถูกทิ้ง"
          value={formatPrice(stats.foodSavedValue)}
          icon="cash" tone="primary"
          hint="คิดจากราคาที่ลูกค้าจ่ายจริง"
          onClick={() => navigate('/reservations?status=completed')}
        />
      </div>

      {/*
        กราฟสองอันวางคู่กัน
        minmax(300px, 1fr) ทำให้จอกว้างวางเรียงกัน 2 คอลัมน์
        พอจอแคบลงจะไหลลงเป็นบนล่างเอง ไม่ต้องเขียน media query
      */}
      <div
        className="grid mt-md"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
      >
        <DailyBarChart data={stats.daily} />
        <StatusDonut data={stats.statusBreakdown} />
      </div>
    </>
  );
}
