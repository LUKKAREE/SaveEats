/**
 * หน้าเข้าสู่ระบบของ Admin
 *
 * หลัก UX
 *   - ตรวจข้อมูลตอนกดปุ่ม แสดง error ในหน้าเลย ไม่ใช้ alert เด้ง
 *   - บอกให้ชัดว่าหน้านี้สำหรับผู้ดูแลระบบเท่านั้น
 *   - ปุ่มกดซ้ำไม่ได้ระหว่างรอผล
 */
import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/apiClient';
import Icon from '../../components/Icon';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setServerError('');

    const nextErrors: FormErrors = {};
    if (email.trim() === '') nextErrors.email = 'กรุณากรอกอีเมล';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (password === '') nextErrors.password = 'กรุณากรอกรหัสผ่าน';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logo}><Icon name="leaf" size={30} color="#fff" /></div>
          <h1 style={styles.title}>SaveEats</h1>
          <p style={styles.subtitle}>ระบบผู้ดูแล</p>
        </div>

        {serverError ? (
          <div className="alert alert-error">
            <Icon name="warning" size={18} />
            <span style={{ whiteSpace: 'pre-line' }}>{serverError}</span>
          </div>
        ) : null}

        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="field">
            <label className="field-label" htmlFor="email">อีเมล</label>
            <input
              id="email"
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@saveeats.com"
              autoComplete="username"
            />
            {errors.email ? <div className="field-error">{errors.email}</div> : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
            {errors.password ? <div className="field-error">{errors.password}</div> : null}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div style={styles.notice}>
          หน้านี้สำหรับผู้ดูแลระบบเท่านั้น
          <br />
          ลูกค้าและร้านค้าให้ใช้แอปมือถือ
        </div>

        {/*
          *** เคยมีกล่อง "บัญชีทดสอบ" ตรงนี้ ลบออกแล้วเมื่อ 13 ก.ย. 2569 ***

          กล่องนั้นโชว์อีเมลกับรหัสผ่านของผู้ดูแลไว้บนหน้าจอ มีไว้ให้สะดวก
          ตอนพัฒนาในเครื่องตัวเอง ซึ่งไม่มีใครนอกจากเราเห็น

          พอเว็บขึ้น Vercel แล้ว ใครที่รู้ลิงก์ก็เปิดหน้านี้ได้ทุกคน
          การโชว์รหัสผู้ดูแลไว้จึงเท่ากับแจกกุญแจให้ทุกคนที่เดินผ่าน

          ถ้าต้องการให้อาจารย์หรือผู้ตรวจเข้าไปดู ให้ส่งบัญชีทางช่องทางอื่น
          เช่น เขียนในรายงาน หรือบอกตอนนำเสนอ ไม่ใช่แปะไว้บนหน้าเว็บ
        */}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(160deg, var(--color-primary-surface), var(--color-background))',
  },
  card: {
    width: '100%', maxWidth: 400,
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-float)',
    padding: 32,
  },
  brand: { textAlign: 'center', marginBottom: 24 },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    background: 'var(--color-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, margin: '0 auto 12px',
  },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--color-primary-dark)' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)' },
  notice: {
    textAlign: 'center', fontSize: 13,
    color: 'var(--color-text-muted)', marginTop: 20,
  },
};
