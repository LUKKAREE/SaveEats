/**
 * กล่องยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้
 *
 * หลัก UX
 *   - การกระทำที่อันตราย (ระงับร้าน / ไม่อนุมัติ) ต้องยืนยันเสมอ
 *   - ปุ่มยกเลิกอยู่ซ้าย ปุ่มยืนยันอยู่ขวา ตามที่คนคุ้นเคย
 *   - รองรับให้กรอกเหตุผลได้ (ใช้ตอนกดไม่อนุมัติร้าน)
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /**
   * เปิดช่องกรอกที่สอง (ไม่บังคับกรอก)
   *
   * *** มีไว้ทำอะไร ***
   * บางงานต้องแยก "บันทึกภายในของผู้ดูแล" ออกจาก "ข้อความที่ส่งถึงผู้ใช้"
   * ถ้าใช้ช่องเดียวแล้วเอาไปแสดงให้ผู้ใช้อ่าน โน้ตภายในจะรั่วออกไปด้วย
   */
  showExtra?: boolean;
  extraLabel?: string;
  extraPlaceholder?: string;
  extraHint?: string;
  /**
   * เปิดช่องติ๊กเลือก (ไม่บังคับ)
   *
   * *** มีไว้ทำอะไร ***
   * บางการกระทำมี "ผลข้างเคียง" ที่ผู้ดูแลต้องเลือกเองว่าจะให้เกิดหรือไม่
   * เช่น ปิดเรื่องร้องเรียนแล้วจะตัดคะแนนร้านด้วยหรือเปล่า
   * แยกเป็นช่องติ๊กชัด ๆ ดีกว่าซ่อนไว้ในเงื่อนไขที่ผู้ดูแลมองไม่เห็น
   */
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxHint?: string;
  checkboxDefault?: boolean;
  loading?: boolean;
  /**
   * reason จะเป็นข้อความว่างถ้าไม่ได้เปิด requireReason
   * extra จะเป็นข้อความว่างถ้าไม่ได้เปิด showExtra
   * checked จะเป็น false เสมอถ้าไม่ได้เปิด showCheckbox
   */
  onConfirm: (reason: string, extra: string, checked: boolean) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message = '',
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  danger = false,
  requireReason = false,
  reasonLabel = 'เหตุผล',
  reasonPlaceholder = '',
  showExtra = false,
  extraLabel = '',
  extraPlaceholder = '',
  extraHint = '',
  showCheckbox = false,
  checkboxLabel = '',
  checkboxHint = '',
  checkboxDefault = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element | null {
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [checked, setChecked] = useState(checkboxDefault);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setExtra('');
      setChecked(checkboxDefault);
      setError('');
    }
  }, [open, checkboxDefault]);

  if (!open) return null;

  function handleConfirm(): void {
    if (requireReason && reason.trim() === '') {
      setError('กรุณากรอกเหตุผล');
      return;
    }
    onConfirm(reason.trim(), extra.trim(), showCheckbox && checked);
  }

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        {message ? <p style={styles.message}>{message}</p> : null}

        {requireReason ? (
          <div className="field mt-md">
            <label className="field-label">{reasonLabel}</label>
            <textarea
              className={`input ${error ? 'input-error' : ''}`}
              style={{ height: 88, padding: 12, resize: 'vertical' }}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder={reasonPlaceholder}
            />
            {error ? <div className="field-error">{error}</div> : null}
          </div>
        ) : null}

        {showExtra ? (
          <div className="field mt-md">
            <label className="field-label">{extraLabel}</label>
            <textarea
              className="input"
              style={{ height: 88, padding: 12, resize: 'vertical' }}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={extraPlaceholder}
            />
            {extraHint ? <div className="text-small text-muted mt-xs">{extraHint}</div> : null}
          </div>
        ) : null}

        {showCheckbox ? (
          <div className="mt-md">
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>{checkboxLabel}</span>
            </label>
            {checkboxHint ? <div className="text-small text-muted mt-xs">{checkboxHint}</div> : null}
          </div>
        ) : null}

        <div style={styles.actions}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(17, 24, 39, 0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg)',
    width: '100%', maxWidth: 460,
    boxShadow: 'var(--shadow-float)',
  },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  message: { color: 'var(--color-text-secondary)', fontSize: 14 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
};
