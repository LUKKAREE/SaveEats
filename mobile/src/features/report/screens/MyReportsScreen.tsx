/**
 * เรื่องที่ฉันแจ้ง
 *
 * ผู้ใช้เข้ามาดูว่าเรื่องที่เคยแจ้งไว้ ตอนนี้ไปถึงไหนแล้ว
 *
 * API : GET /api/reports/my
 *
 * *** ทำไมต้องมีหน้านี้ ***
 * เดิมผู้ใช้กดแจ้งแล้วเห็นแค่ข้อความ "ส่งเรื่องให้ผู้ดูแลระบบแล้ว" จากนั้นเงียบหาย
 * ไม่รู้ว่ามีคนอ่านหรือยัง ผลเป็นอย่างไร คนจึงเลิกแจ้งไปเลยเพราะรู้สึกว่าแจ้งไปก็เท่านั้น
 *
 * *** ใช้ได้ทั้งลูกค้าและร้าน ***
 * ทั้งสองฝั่งแจ้งปัญหาได้ (ดูหน้า ReportScreen) จึงต้องดูประวัติได้ทั้งคู่
 * ชนิด navigation จึงใช้ AppStackParamList ที่ครอบทั้งสอง stack
 */
import { useCallback, useState } from 'react';
import {
  View, Text, Image, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Report, ReportStatus, ReportTargetType } from '@shared/index';
import { REPORT_STATUS_LABEL } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';

import reportService from '../reportService';
import { errorMessage } from '../../../core/services/apiClient';
import { formatRelativeTime } from '../../../core/utils/formatters';
import { imageUrl } from '../../../core/constants/apiConstants';
import { theme } from '../../../core/theme/theme';
import type { AppStackParamList } from '../../../navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

/**
 * สีประจำแต่ละสถานะ
 *
 * ประกาศเป็น Record<ReportStatus, ...> เพื่อบังคับให้ครบทุกสถานะ
 * ถ้าเพิ่มสถานะใหม่ใน shared/src/enums.ts แล้วลืมมาเพิ่มที่นี่ TypeScript จะฟ้องทันที
 */
const STATUS_STYLE: Record<ReportStatus, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  open: { color: theme.colors.textMuted, icon: 'time-outline' },
  reviewing: { color: theme.colors.info, icon: 'search-outline' },
  resolved: { color: theme.colors.success, icon: 'checkmark-circle-outline' },
  rejected: { color: theme.colors.error, icon: 'close-circle-outline' },
};

/**
 * คำอธิบายผลลัพธ์แบบยาว
 *
 * ป้ายสถานะสั้น ๆ อย่าง "ปฏิเสธ" อ่านแล้วชวนเข้าใจผิดว่าโดนไล่
 * ทั้งที่จริงแปลว่าตรวจแล้วไม่พบความผิดปกติ จึงต้องมีประโยคขยายเสมอ
 */
const STATUS_HINT: Record<ReportStatus, string> = {
  open: 'อยู่ในคิวรอผู้ดูแลระบบตรวจสอบ',
  reviewing: 'ผู้ดูแลระบบกำลังตรวจสอบอยู่',
  resolved: 'ตรวจสอบและจัดการเรียบร้อยแล้ว ขอบคุณที่ช่วยแจ้ง',
  rejected: 'ตรวจสอบแล้วยังไม่พบความผิดปกติ',
};

/** สิ่งที่ถูกแจ้งเป็นภาษาไทย */
const TARGET_LABEL: Record<ReportTargetType, string> = {
  store: 'ร้านค้า',
  post: 'โพสต์',
  review: 'รีวิว',
  user: 'ผู้ใช้',
  reservation: 'การจอง',
};

export default function MyReportsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setReports(await reportService.listMine());
    } catch (err) {
      setError(errorMessage(err));
      setReports(null);
    }
  }, []);

  /*
   * ใช้ useFocusEffect ไม่ใช่ useEffect
   * เพราะผู้ใช้อาจเพิ่งกดแจ้งเรื่องใหม่แล้วย้อนกลับมาหน้านี้
   * useEffect จะไม่ทำงานซ้ำ ทำให้เรื่องที่เพิ่งแจ้งไม่โผล่ ผู้ใช้จะนึกว่าแจ้งไม่สำเร็จ
   */
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

  if (loading) return <LoadingView message="กำลังโหลดเรื่องที่คุณแจ้ง..." />;

  if (reports === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="cloud-offline-outline"
          title="โหลดข้อมูลไม่สำเร็จ"
          message={error ?? 'ลองใหม่อีกครั้ง'}
          actionLabel="ลองใหม่"
          onAction={() => { void handleRefresh(); }}
        />
      </ScreenContainer>
    );
  }

  if (reports.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="flag-outline"
          title="ยังไม่เคยแจ้งปัญหา"
          message="ถ้าเจอปัญหาจากร้าน โพสต์ หรือการจอง กดปุ่มแจ้งปัญหาในหน้านั้นได้เลย ผู้ดูแลระบบจะตรวจสอบให้"
        />
      </ScreenContainer>
    );
  }

  const openCount = reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length;

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item.report_id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void handleRefresh(); }} />
        }
        ListHeaderComponent={
          <Text style={styles.summary}>
            แจ้งไปแล้ว {reports.length} เรื่อง
            {openCount > 0 ? ` · กำลังรอผล ${openCount} เรื่อง` : ''}
          </Text>
        }
        renderItem={({ item }) => {
          const badge = STATUS_STYLE[item.status];
          const evidence = imageUrl(item.image_url, 'report');
          const replies = item.message_count ?? 0;

          return (
            /*
             * กดการ์ดเข้าหน้ารายละเอียด ซึ่งมีห้องคุยกับผู้ดูแล
             * หน้านี้เลยทำหน้าที่เป็น "กล่องจดหมาย" ส่วนรายละเอียดอยู่ข้างใน
             */
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ReportDetail', { reportId: item.report_id })}
            >
              <View style={styles.header}>
                <Text style={styles.target} numberOfLines={1}>
                  {/*
                    แสดงชื่อของสิ่งที่แจ้ง ไม่ใช่เลข id
                    เดิมขึ้นว่า "การจอง #12" ซึ่งผู้ใช้แยกไม่ออกว่าคือรายการไหน
                    เพราะเลขนี้เป็นเลขในฐานข้อมูล ไม่เคยแสดงที่อื่นในแอปเลย
                  */}
                  {TARGET_LABEL[item.target_type]} · {item.target_name ?? 'ถูกลบไปแล้ว'}
                </Text>
                <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
              </View>

              <Text style={styles.reason}>{item.reason}</Text>

              {evidence !== null ? (
                <Image source={{ uri: evidence }} style={styles.evidence} resizeMode="cover" />
              ) : null}

              <View style={styles.statusRow}>
                <Ionicons name={badge.icon} size={15} color={badge.color} />
                <Text style={[styles.statusLabel, { color: badge.color }]}>
                  {REPORT_STATUS_LABEL[item.status]}
                </Text>
                <Text style={styles.statusHint}>{STATUS_HINT[item.status]}</Text>
              </View>

              {/*
                ข้อความจากผู้ดูแลถึงผู้ถูกแจ้ง
                คนแจ้งเห็นได้เพราะเป็นผลของเรื่องที่ตัวเองแจ้งมา

                *** ห้ามเอา admin_note มาแสดงตรงนี้เด็ดขาด ***
                นั่นคือบันทึกภายใน อาจมีข้อมูลที่ไม่ควรเปิดเผยอยู่
                Backend จึงไม่เคยส่ง admin_note มาที่เส้นทาง /api/reports/my อยู่แล้ว
              */}
              {item.resolution_message !== null && item.resolution_message !== '' ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyTitle}>ผลการตรวจสอบ</Text>
                  <Text style={styles.replyText}>{item.resolution_message}</Text>
                </View>
              ) : null}

              <View style={styles.cardFoot}>
                <Ionicons name="chatbubble-ellipses-outline" size={13} color={theme.colors.textMuted} />
                <Text style={styles.cardFootText}>
                  {replies === 0 ? 'แตะเพื่อคุยกับผู้ดูแล' : `มีข้อความ ${String(replies)} รายการ`}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  summary: { ...theme.textStyles.caption, marginBottom: theme.spacing.sm },

  evidence: {
    width: '100%',
    height: 140,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cardFootText: { ...theme.textStyles.caption, color: theme.colors.textMuted, flex: 1 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  target: { ...theme.textStyles.caption, color: theme.colors.textMuted },
  time: { ...theme.textStyles.caption },
  reason: { ...theme.textStyles.body, marginTop: theme.spacing.xs },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  statusLabel: { ...theme.textStyles.caption, fontWeight: '600' },
  statusHint: { ...theme.textStyles.caption, color: theme.colors.textMuted },

  replyBox: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  replyTitle: { ...theme.textStyles.caption, fontWeight: '600', marginBottom: 2 },
  replyText: { ...theme.textStyles.body },
});
