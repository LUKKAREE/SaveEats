/**
 * กล่องดูรายละเอียดเรื่องร้องเรียน + คุยกับผู้แจ้ง
 *
 * *** ทำไมต้องมีห้องคุย ***
 * เดิมผู้ดูแลมีข้อมูลแค่ข้อความเดียวที่ผู้ใช้พิมพ์มาตอนแจ้ง
 * ถ้าข้อความนั้นไม่พอตัดสิน ก็ทำได้แค่เดา หรือปิดเรื่องไปตามที่มี
 * ห้องนี้ทำให้ถามกลับได้ เช่น ขอรูปเพิ่ม หรือถามว่าเกิดเรื่องตอนกี่โมง
 *
 * *** ใครอยู่ในห้องนี้ : ผู้แจ้ง กับ ผู้ดูแล เท่านั้น ***
 * ผู้ถูกแจ้งไม่เห็นห้องนี้ เพราะระบบออกแบบให้เขาไม่รู้ว่าใครเป็นคนแจ้ง
 * เวลาพิมพ์จึงพูดกับ "ผู้แจ้ง" ได้ตรง ๆ โดยไม่ต้องระวังเรื่องเปิดเผยตัวตน
 * แต่ต้องระวังอีกทางแทน คือห้ามเอาข้อมูลของผู้ถูกแจ้งมาเล่าให้ผู้แจ้งฟัง
 *
 * API : GET  /api/admin/reports/:id/messages
 *       POST /api/admin/reports/:id/messages
 */
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Report, ReportMessage } from '@shared/index';
import { REPORT_STATUS_LABEL } from '@shared/index';

import adminService from '../../services/adminService';
import { errorMessage, imageUrl } from '../../services/apiClient';
import { formatDateTime } from '../../utils/format';

interface ReportThreadDialogProps {
  /** null = ปิดกล่อง */
  report: Report | null;
  onClose: () => void;
  /** เรียกเมื่อส่งข้อความสำเร็จ ให้หน้ารายการไปโหลดตัวเลขจำนวนข้อความใหม่ */
  onSent?: () => void;
}

export default function ReportThreadDialog({
  report,
  onClose,
  onSent,
}: ReportThreadDialogProps): JSX.Element | null {
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const reportId = report?.report_id ?? null;

  const load = useCallback(async (): Promise<void> => {
    if (reportId === null) return;
    setLoading(true);
    setError('');
    try {
      setMessages(await adminService.getReportMessages(reportId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    setDraft('');
    setMessages([]);
    void load();
  }, [load]);

  if (report === null || reportId === null) return null;

  async function handleSend(): Promise<void> {
    const text = draft.trim();
    if (text === '' || sending || reportId === null) return;

    setSending(true);
    setError('');
    try {
      const saved = await adminService.addReportMessage(reportId, text);
      // ต่อท้ายเลย ไม่ต้องโหลดใหม่ทั้งห้อง ผู้ดูแลจะเห็นข้อความตัวเองทันที
      setMessages((prev) => [...prev, saved]);
      setDraft('');
      onSent?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const evidence = imageUrl(report.image_url, 'report');

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.head}>
          <h3 style={styles.title}>เรื่องร้องเรียน #{report.report_id}</h3>
          <span className="text-small text-muted">{REPORT_STATUS_LABEL[report.status]}</span>
        </div>

        {/* ---- ตัวเรื่อง ---- */}
        <div style={styles.section}>
          <div className="text-small text-muted">
            {report.reporter_name ?? `ผู้ใช้ #${report.reporter_id}`}
            {' · '}
            {formatDateTime(report.created_at)}
          </div>
          <div className="mt-xs">{report.reason}</div>

          {evidence !== null ? (
            <div className="mt-md">
              <div className="text-small text-muted">รูปหลักฐานที่ผู้แจ้งแนบมา</div>
              {/*
                เปิดรูปเต็มในแท็บใหม่ได้ เพราะรูปในกล่องนี้ย่อจนดูรายละเอียดไม่ออก
                ซึ่งรายละเอียดคือทั้งหมดของการเป็นหลักฐาน
              */}
              <a href={evidence} target="_blank" rel="noreferrer">
                <img src={evidence} alt="รูปหลักฐาน" style={styles.evidence} />
              </a>
            </div>
          ) : (
            <div className="text-small text-muted mt-md">ผู้แจ้งไม่ได้แนบรูปมา</div>
          )}
        </div>

        {/* ---- บทสนทนา ---- */}
        <div style={styles.thread}>
          {loading ? (
            <div className="text-small text-muted">กำลังโหลดข้อความ...</div>
          ) : messages.length === 0 ? (
            <div className="text-small text-muted">
              ยังไม่มีการพูดคุย ถ้าข้อมูลไม่พอตัดสิน ถามผู้แจ้งได้จากช่องข้างล่าง
            </div>
          ) : (
            messages.map((m) => {
              const fromAdmin = m.sender_role === 'admin';
              return (
                <div
                  key={m.message_id}
                  style={{
                    ...styles.bubbleRow,
                    justifyContent: fromAdmin ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={fromAdmin ? styles.bubbleAdmin : styles.bubbleReporter}>
                    <div style={styles.bubbleSender}>
                      {fromAdmin ? 'ผู้ดูแลระบบ' : (m.sender_name ?? 'ผู้แจ้ง')}
                    </div>
                    <div>{m.message}</div>
                    <div style={styles.bubbleTime}>{formatDateTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error ? <div className="field-error mt-xs">{error}</div> : null}

        {/* ---- ช่องพิมพ์ ---- */}
        <div className="field mt-md">
          <textarea
            className="input"
            style={{ height: 76, padding: 12, resize: 'vertical' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="เช่น รบกวนขอรูปตอนได้รับอาหาร และบอกเวลาที่ไปรับด้วยครับ"
            maxLength={1000}
          />
          <div className="text-small text-muted mt-xs">
            ข้อความนี้ส่งถึงผู้แจ้งเท่านั้น ผู้ถูกแจ้งไม่เห็น
          </div>
        </div>

        <div style={styles.actions}>
          <button className="btn btn-ghost" onClick={onClose} disabled={sending}>
            ปิด
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { void handleSend(); }}
            disabled={draft.trim() === '' || sending}
          >
            {sending ? 'กำลังส่ง...' : 'ส่งข้อความ'}
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
    width: '100%', maxWidth: 560,
    maxHeight: '88vh', overflowY: 'auto',
    boxShadow: 'var(--shadow-float)',
  },
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 18, fontWeight: 600 },

  section: {
    marginTop: 12,
    padding: 12,
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface-alt)',
  },
  evidence: {
    display: 'block',
    marginTop: 6,
    maxWidth: '100%',
    maxHeight: 220,
    borderRadius: 'var(--radius-md)',
  },

  thread: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 260,
    overflowY: 'auto',
  },
  bubbleRow: { display: 'flex' },
  bubbleReporter: {
    maxWidth: '80%', padding: 10,
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface-alt)',
    fontSize: 14,
  },
  bubbleAdmin: {
    maxWidth: '80%', padding: 10,
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-primary-light)',
    fontSize: 14,
  },
  bubbleSender: { fontSize: 12, fontWeight: 600, marginBottom: 2 },
  bubbleTime: { fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 },

  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
};
