/** แถบหัวเรื่องด้านบนของแต่ละหน้า */
import type { CSSProperties, ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps): JSX.Element {
  return (
    <header style={styles.header}>
      <div style={{ minWidth: 0 }}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </header>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 'var(--space-lg)',
    flexWrap: 'wrap',
  },
  title: { fontSize: 24, fontWeight: 700, lineHeight: 1.3 },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)' },
};
