/**
 * การ์ดสรุปตัวเลขในหน้า Dashboard
 *
 * หลัก UX : ตัวเลขต้องใหญ่และอ่านได้ก่อน คำอธิบายรองลงมา
 */
import type { CSSProperties, ReactNode } from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';

/** โทนสีของการ์ด บอกความสำคัญของตัวเลขนั้น */
export type CardTone = 'primary' | 'accent' | 'warning' | 'info' | 'error';

interface DashboardCardProps {
  label: string;
  value: ReactNode;
  icon?: IconName;
  tone?: CardTone;
  hint?: string;
  onClick?: (() => void) | undefined;
}

const TONE_COLORS: Record<CardTone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--color-primary-light)', fg: 'var(--color-primary-dark)' },
  accent: { bg: 'var(--color-accent-light)', fg: 'var(--color-accent-dark)' },
  warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning-text)' },
  info: { bg: 'var(--color-info-bg)', fg: 'var(--color-info)' },
  error: { bg: 'var(--color-error-bg)', fg: 'var(--color-error)' },
};

export default function DashboardCard({
  label,
  value,
  icon = 'stats-chart',
  tone = 'primary',
  hint = '',
  onClick,
}: DashboardCardProps): JSX.Element {
  const colors = TONE_COLORS[tone];

  const iconStyle: CSSProperties = {
    width: 52, height: 52, borderRadius: 'var(--radius-md)',
    background: colors.bg, color: colors.fg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };

  const clickable = onClick !== undefined;

  return (
    <div
      className={clickable ? 'card card-clickable' : 'card'}
      onClick={onClick}
      /*
        *** ทำไมต้องใส่ role กับ tabIndex ***
        นี่คือ <div> ไม่ใช่ <button> เบราว์เซอร์จึงไม่รู้เองว่ากดได้
        คนที่ใช้คีย์บอร์ดอย่างเดียวจะ Tab มาไม่ถึง และโปรแกรมอ่านหน้าจอก็ไม่บอกว่ากดได้
        สามบรรทัดนี้ทำให้การ์ดทำตัวเหมือนปุ่มจริง ๆ ทั้งกด Enter และ Space ได้
      */
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();   // กัน Space เลื่อนหน้าลงไปด้วย
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md)',
      }}
    >
      <div style={iconStyle}><Icon name={icon} size={25} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
        <div className="text-small text-muted">{label}</div>
        {hint ? <div className="text-small" style={{ color: colors.fg }}>{hint}</div> : null}
      </div>

      {/* ลูกศรบอกว่ากดแล้วไปต่อได้ เป็นสัญญาณที่คนคุ้นเคยอยู่แล้วโดยไม่ต้องอธิบาย */}
      {clickable ? (
        <Icon name="chevron-forward" size={18} color="var(--color-text-muted)" />
      ) : null}
    </div>
  );
}
