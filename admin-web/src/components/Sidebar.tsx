/**
 * เมนูด้านข้างของ Admin Web
 *
 * หลัก UX
 *   - จัดเมนูเป็นกลุ่มตามงาน ไม่เรียงยาวเป็นพืด
 *   - หน้า "ร้านรออนุมัติ" เด่นกว่าเมนูอื่น เพราะเป็นงานหลักที่สุดของ Admin
 *   - เมนูที่กำลังเปิดอยู่มีแถบเขียวด้านซ้าย
 */
import { NavLink } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import type { IconName } from './Icon';

interface MenuItem {
  to: string;
  label: string;
  icon: IconName;
  highlight?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'ภาพรวม',
    items: [{ to: '/dashboard', label: 'แดชบอร์ด', icon: 'stats-chart' }],
  },
  {
    title: 'จัดการร้านค้า',
    items: [
      { to: '/stores/pending', label: 'ร้านรออนุมัติ', icon: 'hourglass', highlight: true },
      { to: '/stores', label: 'ร้านค้าทั้งหมด', icon: 'storefront' },
      { to: '/behavior', label: 'คะแนนความประพฤติ', icon: 'star' },
    ],
  },
  {
    title: 'จัดการข้อมูล',
    items: [
      { to: '/customers', label: 'ลูกค้า', icon: 'people' },
      { to: '/posts', label: 'โพสต์', icon: 'document-text' },
      { to: '/reservations', label: 'การจอง', icon: 'receipt' },
      { to: '/reviews', label: 'รีวิว', icon: 'chatbubble-ellipses' },
    ],
  },
  {
    title: 'ดูแลระบบ',
    items: [{ to: '/reports', label: 'การแจ้งปัญหา', icon: 'flag' }],
  },
];

/**
 * ตัวสัญลักษณ์ SaveEats (หมุดแผนที่ + ช้อนส้อม)
 *
 * *** ทำไมวาดเป็น SVG ในโค้ด ไม่ใช้ไฟล์รูป ***
 * โลโก้นี้อยู่ในกล่องสีเขียวขนาด 38px ต้องเป็นสีขาวล้วนพอดีกรอบ
 * ถ้าใช้ไฟล์ .png จะได้ขอบหยักตอนจอความละเอียดสูง และเปลี่ยนสีทีหลังไม่ได้
 * ต้นฉบับเต็ม ๆ อยู่ที่ mobile/assets/brand/logo-mark.svg
 *
 * viewBox ครอปพอดีรูปหมุด (กว้าง 320 สูง 440) จึงไม่มีขอบว่างรอบ ๆ
 */
function BrandMark(): JSX.Element {
  return (
    <svg viewBox="96 36 320 440" width="21" height="29" aria-hidden="true">
      <path
        fillRule="evenodd"
        fill="#fff"
        d="M 256 476 L 387.3 287.4 A 160 160 0 1 0 124.7 287.4 Z
           M 256 80 A 116 116 0 1 0 256 312 A 116 116 0 1 0 256 80 Z"
      />
      <ellipse cx="218" cy="158" rx="23" ry="31" fill="#fff" />
      <rect x="210" y="182" width="16" height="88" rx="8" fill="#fff" />
      <rect x="272" y="126" width="11" height="52" rx="5.5" fill="#fff" />
      <rect x="288" y="126" width="11" height="52" rx="5.5" fill="#fff" />
      <rect x="304" y="126" width="11" height="52" rx="5.5" fill="#fff" />
      <path d="M 272 164 H 315 V 178 C 315 190 306 198 294 198 H 293 C 281 198 272 190 272 178 Z" fill="#fff" />
      <rect x="286" y="186" width="15" height="84" rx="7.5" fill="#fff" />
    </svg>
  );
}

export default function Sidebar(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <aside style={styles.sidebar}>
      {/* ---- โลโก้ ---- */}
      <div style={styles.brand}>
        <div style={styles.logo}><BrandMark /></div>
        <div>
          <div style={styles.brandName}>SaveEats</div>
          <div style={styles.brandSub}>ระบบผู้ดูแล</div>
        </div>
      </div>

      {/* ---- เมนู ---- */}
      <nav style={styles.nav}>
        {MENU_GROUPS.map((group) => (
          <div key={group.title} style={styles.group}>
            <div style={styles.groupTitle}>{group.title}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }): CSSProperties => ({
                  ...styles.link,
                  ...(isActive ? styles.linkActive : {}),
                  ...(item.highlight === true && !isActive ? styles.linkHighlight : {}),
                })}
              >
                <span style={styles.icon}><Icon name={item.icon} size={17} /></span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ---- ผู้ใช้ที่ Login อยู่ ---- */}
      <div style={styles.footer}>
        <div style={styles.userRow}>
          <div style={styles.avatar}>{user?.name.charAt(0) ?? 'A'}</div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm btn-block mt-md" onClick={logout}>
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  sidebar: {
    width: 'var(--sidebar-width)',
    flexShrink: 0,
    background: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 16px',
    height: 'var(--header-height)',
    borderBottom: '1px solid var(--color-border)',
  },
  logo: {
    width: 38, height: 38, borderRadius: 10,
    background: 'var(--color-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20,
  },
  brandName: { fontWeight: 700, fontSize: 16, lineHeight: 1.2 },
  brandSub: { fontSize: 12, color: 'var(--color-text-muted)' },

  nav: { flex: 1, overflowY: 'auto', padding: '16px 12px' },
  group: { marginBottom: 20 },
  groupTitle: {
    fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
    color: 'var(--color-text-muted)',
    padding: '0 10px 6px',
    textTransform: 'uppercase',
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    marginBottom: 2,
    borderLeft: '3px solid transparent',
  },
  linkActive: {
    background: 'var(--color-primary-surface)',
    color: 'var(--color-primary-dark)',
    fontWeight: 600,
    borderLeft: '3px solid var(--color-primary)',
  },
  linkHighlight: { color: 'var(--color-warning-text)', background: 'var(--color-warning-bg)' },
  // กว้างคงที่ ไอคอนทุกอันจึงเรียงตรงกันเป็นแนวเดียว ตัวหนังสือไม่เยื้องไปมา
  icon: { width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 },

  footer: { padding: 16, borderTop: '1px solid var(--color-border)' },
  userRow: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'var(--color-primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, flexShrink: 0,
  },
  userName: {
    fontSize: 14, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: 12, color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
};
