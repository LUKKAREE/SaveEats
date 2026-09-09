/**
 * รายละเอียดเรื่องที่แจ้ง + ห้องสนทนากับผู้ดูแลระบบ
 *
 * เข้ามาจากหน้า "เรื่องที่ฉันแจ้ง" โดยแตะที่การ์ดของเรื่องนั้น
 *
 * *** ทำไมต้องมีหน้านี้ ***
 * เดิมเรื่องที่แจ้งไปเป็นการสื่อสารทางเดียว ผู้ใช้พิมพ์ครั้งเดียวตอนแจ้ง
 * แล้วรอผลอย่างเดียว ถ้าผู้ดูแลอยากรู้ข้อมูลเพิ่มก็ทำอะไรไม่ได้
 * ต้องปิดเรื่องไปตามที่มีข้อมูลอยู่ หรือติดต่อนอกระบบซึ่งไม่มีหลักฐาน
 *
 * *** ใครอยู่ในห้องนี้ : เรา กับ ผู้ดูแล เท่านั้น ***
 * ผู้ถูกแจ้งไม่เห็นห้องนี้และไม่รู้ว่าใครแจ้ง Backend กันไว้ให้แล้ว
 *
 * API : GET  /api/reports/my              (เอาตัวเรื่อง)
 *       GET  /api/reports/:id/messages    (บทสนทนา)
 *       POST /api/reports/:id/messages    (ส่งข้อมูลเพิ่ม)
 */
import { useCallback, useState } from 'react';
import {
  View, Text, TextInput, Image, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Report, ReportMessage } from '@shared/index';
import { REPORT_STATUS_LABEL } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import StickyFooter from '../../../components/StickyFooter';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';

import reportService from '../reportService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { formatDateTime, formatRelativeTime } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { AppStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ReportDetail'>;

/** ป้ายสถานะ ใช้ชุดสีเดียวกับหน้า "เรื่องที่ฉันแจ้ง" เพื่อไม่ให้ผู้ใช้สับสน */
const STATUS_COLOR: Record<Report['status'], string> = {
  open: theme.colors.warningText,
  reviewing: theme.colors.primary,
  resolved: theme.colors.success,
  rejected: theme.colors.textMuted,
};

const TARGET_LABEL: Record<Report['target_type'], string> = {
  store: 'ร้าน',
  post: 'โพสต์',
  review: 'รีวิว',
  user: 'ผู้ใช้',
  reservation: 'การจอง',
};

export default function ReportDetailScreen({ route }: Props): JSX.Element {
  const { reportId } = route.params;

  const [report, setReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      /*
       * ยิงสองเส้นพร้อมกันด้วย Promise.all ไม่ใช่ต่อคิวกัน
       * เพราะสองเส้นนี้ไม่ได้พึ่งผลของกันและกัน การรอทีละเส้นทำให้ช้าขึ้นเป็นเท่าตัว
       * โดยไม่ได้อะไรกลับมาเลย
       */
      const [all, thread] = await Promise.all([
        reportService.listMine(),
        reportService.listMessages(reportId),
      ]);
      setReport(all.find((r) => r.report_id === reportId) ?? null);
      setMessages(thread);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [reportId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [load])
  );

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSend(): Promise<void> {
    const text = draft.trim();
    if (text === '' || sending) return;

    setSending(true);
    setError(null);
    try {
      const saved = await reportService.addMessage(reportId, text);
      // ต่อท้ายเลย ไม่ต้องโหลดใหม่ทั้งห้อง ผู้ใช้จะเห็นข้อความตัวเองทันที
      setMessages((prev) => [...prev, saved]);
      setDraft('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingView message="กำลังโหลดเรื่องที่แจ้ง..." />;

  if (report === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="cloud-offline-outline"
          title="ไม่พบเรื่องนี้"
          message={error ?? 'เรื่องนี้อาจถูกลบไปแล้ว'}
          actionLabel="ลองใหม่"
          onAction={() => { void handleRefresh(); }}
        />
      </ScreenContainer>
    );
  }

  /*
   * เรื่องที่ปิดไปแล้วพิมพ์ต่อไม่ได้
   * ซ่อนช่องพิมพ์ไปเลยดีกว่าปล่อยให้พิมพ์แล้วค่อยขึ้น error ตอนกดส่ง
   * เพราะผู้ใช้จะเสียเวลาพิมพ์ฟรีโดยไม่รู้ตัวมาก่อน
   */
  const closed = report.status === 'resolved' || report.status === 'rejected';
  const evidence = imageUrl(report.image_url, 'report');

  return (
    <ScreenContainer padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { void handleRefresh(); }} />
          }
        >
          {/* ---- ตัวเรื่องที่แจ้ง ---- */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.target} numberOfLines={2}>
                {TARGET_LABEL[report.target_type]} · {report.target_name ?? 'ถูกลบไปแล้ว'}
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[report.status] }]}>
                {REPORT_STATUS_LABEL[report.status]}
              </Text>
            </View>

            <Text style={styles.time}>แจ้งเมื่อ {formatDateTime(report.created_at)}</Text>
            <Text style={styles.reason}>{report.reason}</Text>

            {evidence !== null ? (
              <Image source={{ uri: evidence }} style={styles.evidence} resizeMode="cover" />
            ) : null}

            {report.resolution_message !== null && report.resolution_message !== '' ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyTitle}>ผลการตรวจสอบ</Text>
                <Text style={styles.replyText}>{report.resolution_message}</Text>
              </View>
            ) : null}
          </View>

          {/* ---- บทสนทนา ---- */}
          <Text style={styles.threadTitle}>คุยกับผู้ดูแลระบบ</Text>

          {messages.length === 0 ? (
            <Text style={styles.threadHint}>
              {closed
                ? 'เรื่องนี้ปิดแล้ว และไม่มีการพูดคุยเพิ่มเติม'
                : 'ยังไม่มีข้อความ ถ้ามีข้อมูลเพิ่มเติม พิมพ์บอกผู้ดูแลได้เลย'}
            </Text>
          ) : (
            messages.map((m) => {
              const mine = m.sender_role === 'reporter';
              return (
                <View
                  key={m.message_id}
                  style={[styles.bubbleRow, mine ? styles.bubbleRowMine : null]}
                >
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAdmin]}>
                    {!mine ? <Text style={styles.bubbleSender}>ผู้ดูแลระบบ</Text> : null}
                    <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : null]}>
                      {m.message}
                    </Text>
                    <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : null]}>
                      {formatRelativeTime(m.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {error !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* ---- ช่องพิมพ์ ----
            *** ต้องใช้ StickyFooter ห้ามใช้ View ธรรมดา ***
            ScreenContainer กันขอบให้เฉพาะด้านบน (edges={['top']}) เท่านั้น
            ของที่ตรึงอยู่ล่างจอจึงต้องเผื่อความสูงแถบปุ่มของระบบเอง
            ไม่งั้นบนเครื่องที่ใช้ปุ่ม 3 ปุ่ม ช่องพิมพ์กับปุ่มส่งจะไปนอนทับ
            ปุ่มย้อนกลับ/โฮมของเครื่อง กดส่งทีไรก็โดนปุ่มโฮมแทน

            เดิมหน้านี้เขียน View เองจึงพลาดข้อนี้ไป หน้าอื่นที่มีแถบตรึงล่างจอ
            (ตัวกรอง / รายละเอียดโพสต์ / ยืนยันการจอง) ใช้ StickyFooter อยู่แล้ว */}
        {closed ? (
          <StickyFooter style={styles.closedBar}>
            <Ionicons name="lock-closed-outline" size={15} color={theme.colors.textMuted} />
            <Text style={styles.closedText}>
              เรื่องนี้ปิดแล้ว ถ้ายังมีปัญหาอยู่ กรุณาแจ้งเป็นเรื่องใหม่
            </Text>
          </StickyFooter>
        ) : (
          <StickyFooter style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="พิมพ์ข้อมูลเพิ่มเติม..."
              placeholderTextColor={theme.colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, draft.trim() === '' ? styles.sendButtonOff : null]}
              onPress={() => { void handleSend(); }}
              disabled={draft.trim() === '' || sending}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
          </StickyFooter>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  target: { ...theme.textStyles.body, fontFamily: theme.fonts.medium, flex: 1 },
  status: { ...theme.textStyles.caption, fontFamily: theme.fonts.medium },
  time: { ...theme.textStyles.caption, marginTop: 2 },
  reason: { ...theme.textStyles.body, marginTop: theme.spacing.sm },

  evidence: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },

  replyBox: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  replyTitle: {
    ...theme.textStyles.caption,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primaryDark,
  },
  replyText: { ...theme.textStyles.body, marginTop: 2 },

  threadTitle: {
    ...theme.textStyles.subheading,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  threadHint: { ...theme.textStyles.bodyMuted },

  bubbleRow: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: theme.radius.md, padding: theme.spacing.sm },
  bubbleAdmin: { backgroundColor: theme.colors.surface, ...theme.shadows.card },
  bubbleMine: { backgroundColor: theme.colors.primary },
  bubbleSender: {
    ...theme.textStyles.caption,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primaryDark,
    marginBottom: 2,
  },
  bubbleText: { ...theme.textStyles.body },
  bubbleTextMine: { color: theme.colors.textOnPrimary },
  bubbleTime: { ...theme.textStyles.caption, marginTop: 4 },
  bubbleTimeMine: { color: theme.colors.textOnPrimary, opacity: 0.8 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  errorText: { ...theme.textStyles.caption, color: theme.colors.error, flex: 1 },

  /*
   * StickyFooter จัดพื้นหลัง เส้นคั่น และระยะเผื่อแถบระบบให้แล้ว
   * ที่นี่จึงเหลือแค่บอกว่าเรียงแนวนอน
   *
   * *** ห้ามใส่ padding หรือ paddingBottom ตรงนี้ ***
   * style ที่ส่งเข้าไปจะถูกวางทับค่าของ StickyFooter ถ้าใส่ padding ลงไป
   * ระยะเผื่อแถบระบบจะหายไป แล้วบั๊กเดิมจะกลับมาโดยที่ดูโค้ดแล้วไม่เห็นสาเหตุ
   */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  input: {
    ...theme.textStyles.body,
    flex: 1,
    maxHeight: 110,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonOff: { opacity: 0.4 },

  /* เหมือน inputBar ทุกอย่าง ต่างแค่พื้นหลังเทาเพื่อบอกว่าพิมพ์ต่อไม่ได้แล้ว */
  closedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  closedText: { ...theme.textStyles.caption, flex: 1 },
});
