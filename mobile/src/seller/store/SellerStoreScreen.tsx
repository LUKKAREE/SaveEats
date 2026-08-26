/**
 * ข้อมูลร้านของฉัน (ใช้ได้จริงแล้ว)
 *
 * ร้านเข้ามาดูว่าข้อมูลที่ลูกค้าเห็นเป็นอย่างไร และดูคะแนนความประพฤติของตัวเอง
 *
 * *** คะแนนความประพฤติสำคัญมาก ***
 * ถ้าต่ำกว่า 40 ร้านจะลงขายไม่ได้เลย จึงต้องแสดงให้เด่นและอธิบายเกณฑ์ให้ชัด
 * ร้านจะได้รู้ตัวก่อนโดนระงับ ไม่ใช่มารู้ตอนลงขายไม่ได้แล้ว
 *
 * API : GET /api/stores/me
 */
import { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MyStorePayload } from '@shared/index';
import { BEHAVIOR_STATUS_LABEL } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';

import storeService from '../services/storeService';
import { errorMessage } from '../../core/services/apiClient';
import { imageUrl } from '../../core/constants/apiConstants';
import { formatRating, formatRelativeTime } from '../../core/utils/formatters';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

/** สีของคะแนน ใช้เกณฑ์เดียวกับที่ Backend ใช้ตัดสินสถานะ */
function scoreColor(score: number): string {
  if (score >= 70) return theme.colors.success;
  if (score >= 40) return theme.colors.warningText;
  return theme.colors.error;
}

/** คะแนนที่ต่ำกว่านี้ ร้านจะถูกระงับและลงขายไม่ได้ (ต้องตรงกับฝั่ง Backend) */
const SUSPEND_THRESHOLD = 40;

export default function SellerStoreScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [data, setData] = useState<MyStorePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setData(await storeService.getMyStore());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

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

  if (loading) return <LoadingView message="กำลังโหลดข้อมูลร้าน..." />;

  if (data === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="storefront-outline"
          title="โหลดข้อมูลร้านไม่สำเร็จ"
          message={error ?? 'ไม่พบร้านของคุณในระบบ'}
          actionLabel="ลองใหม่"
          onAction={() => { void handleRefresh(); }}
        />
      </ScreenContainer>
    );
  }

  const { store, foods, behavior } = data;
  const cover = imageUrl(store.image, 'store');

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void handleRefresh(); }} />
        }
      >
        {/* ---- รูปหน้าร้าน ---- */}
        {cover !== null ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Ionicons name="image-outline" size={36} color={theme.colors.textMuted} />
            <Text style={styles.coverHint}>ยังไม่ได้ใส่รูปหน้าร้าน</Text>
          </View>
        )}

        {/* ---- ข้อมูลร้าน ---- */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.storeName}>{store.store_name}</Text>
            <StatusBadge status={store.status} type="store" />
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={theme.colors.accent} />
            <Text style={styles.ratingText}>
              {Number(store.rating) > 0
                ? formatRating(store.rating, store.review_count)
                : 'ยังไม่มีรีวิว'}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.ratingText}>{foods.length} เมนูในคลัง</Text>
          </View>

          {store.status === 'pending' ? (
            <View style={styles.warnBox}>
              <Ionicons name="hourglass-outline" size={18} color={theme.colors.warningText} />
              <Text style={styles.warnText}>
                ร้านกำลังรอผู้ดูแลระบบตรวจสอบ ระหว่างนี้ยังลงขายไม่ได้
              </Text>
            </View>
          ) : null}

          {store.status === 'rejected' && store.reject_reason !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="close-circle-outline" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>เหตุผลที่ไม่อนุมัติ : {store.reject_reason}</Text>
            </View>
          ) : null}

          <InfoRow icon="document-text-outline" text={store.description ?? 'ยังไม่ได้ใส่คำอธิบายร้าน'} />
          <InfoRow icon="location-outline" text={store.address ?? 'ยังไม่ได้ใส่ที่อยู่'} />
          <InfoRow icon="call-outline" text={store.phone ?? 'ยังไม่ได้ใส่เบอร์โทร'} />
          <InfoRow
            icon="time-outline"
            text={
              store.open_time !== null && store.close_time !== null
                ? `เปิด ${store.open_time.slice(0, 5)} - ${store.close_time.slice(0, 5)} น.`
                : 'ยังไม่ได้ใส่เวลาเปิด-ปิด'
            }
          />
          <InfoRow
            icon="navigate-outline"
            text={
              store.latitude !== null && store.longitude !== null
                ? 'ปักหมุดตำแหน่งร้านแล้ว ลูกค้าหาเจอบนแผนที่'
                : 'ยังไม่ได้ปักหมุด ลูกค้าจะหาร้านบนแผนที่ไม่เจอ'
            }
          />

          <AppButton
            title="แก้ไขข้อมูลร้าน"
            variant="outline"
            icon={<Ionicons name="create-outline" size={18} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('SellerEditStore')}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>

        {/* ---- คะแนนความประพฤติ ---- */}
        <View style={styles.card}>
          {/*
            *** ย้ายป้ายสถานะขึ้นมาอยู่แถวหัวข้อ ***
            เดิมป้ายอยู่ข้างตัวเลขคะแนน ซึ่งเบียดกันจนแถวนั้นแน่นไปหมด
            ตัวเลขเป็นพระเอกของการ์ดนี้ จึงควรได้อยู่บรรทัดของตัวเองโล่ง ๆ
          */}
          <View style={styles.scoreHeader}>
            <Text style={styles.sectionTitle}>คะแนนความประพฤติ</Text>
            <View
              style={[styles.behaviorBadge, { backgroundColor: `${scoreColor(behavior.score)}1A` }]}
            >
              <Text style={[styles.behaviorText, { color: scoreColor(behavior.score) }]}>
                {BEHAVIOR_STATUS_LABEL[behavior.status]}
              </Text>
            </View>
          </View>

          {/*
            *** ตัวเลขกับ "/ 100" ต้องเป็น Text คนละตัว ห้ามซ้อนกัน ***
            เดิมเขียน <Text 32px>{score}<Text 14px> / 100</Text></Text>
            ตัวลูกมี lineHeight 18 (ติดมาจาก textStyles.caption) ซึ่งเตี้ยกว่ากล่องบรรทัด
            ของตัวแม่ที่สูง 32 พอ Android วาดจริงจึงตัดตัวเลขข้างล่างขาดไปครึ่งตัว
            (คือเลข 100 ที่ดูไม่เต็มในหน้าจอ)

            แยกเป็นสองก้อนวางเรียงกันแบบ baseline แทน ตัวหนังสือจะนั่งบนเส้นเดียวกันพอดี
            และไม่มีใครไปตัดใครอีก
          */}
          <View style={styles.scoreRow}>
            <Text style={[styles.score, { color: scoreColor(behavior.score) }]}>
              {behavior.score}
            </Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>

          {/*
            หนีบค่าให้อยู่ระหว่าง 0-100 ก่อน กันกรณีข้อมูลผิดปกติทำให้แถบล้นกรอบ
            ต้องเก็บเป็น number ก่อนแล้วค่อยใส่ใน template
            ถ้าแปลงเป็น string ก่อน TypeScript จะมองว่าเป็น `${string}%` ซึ่งใส่ใน width ไม่ได้
          */}
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(0, Math.min(100, behavior.score))}%`,
                  backgroundColor: scoreColor(behavior.score),
                },
              ]}
            />
            {/*
              ขีดบอกเส้นตายที่ 40 คะแนน
              เดิมเป็นประโยคว่า "ต่ำกว่า 40 คะแนน ร้านจะถูกระงับ" ซึ่งต้องอ่านแล้วไปคิดต่อเองว่า
              ตอนนี้ห่างจากเส้นนั้นแค่ไหน พอเป็นขีดบนแถบเลย ร้านเห็นปุ๊บรู้ปั๊บว่ายังห่างอยู่เท่าไหร่
            */}
            <View style={[styles.barMark, { left: `${SUSPEND_THRESHOLD}%` }]} />
          </View>

          {/*
            เกณฑ์คะแนน แยกเป็นบรรทัดละข้อ
            เดิมยัดสองข้อไว้ในประโยคเดียวคั่นด้วยจุด แล้วต่อด้วยเงื่อนไขการระงับอีกบรรทัด
            กลายเป็นตัวหนังสือสีเทาติดกันสามบรรทัดที่ตาไม่รู้จะเริ่มอ่านตรงไหน
          */}
          <View style={styles.rules}>
            <ScoreRule
              icon="arrow-up-circle"
              color={theme.colors.success}
              text="ส่งมอบอาหารสำเร็จ"
              delta="+1"
            />
            <ScoreRule
              icon="arrow-down-circle"
              color={theme.colors.error}
              text="ยกเลิกการจองของลูกค้า"
              delta="-5"
            />
          </View>

          <Text style={styles.thresholdHint}>
            ขีดบนแถบคือ {SUSPEND_THRESHOLD} คะแนน ต่ำกว่านี้ร้านจะถูกระงับและลงขายไม่ได้
          </Text>

          {/* ---- ประวัติการเปลี่ยนคะแนน ---- */}
          {behavior.logs.length > 0 ? (
            <View style={styles.logWrap}>
              <Text style={styles.logTitle}>ประวัติล่าสุด</Text>
              {behavior.logs.slice(0, 5).map((log) => (
                <View key={log.log_id} style={styles.logRow}>
                  <Text
                    style={[
                      styles.logChange,
                      { color: log.score_change >= 0 ? theme.colors.success : theme.colors.error },
                    ]}
                  >
                    {log.score_change > 0 ? '+' : ''}
                    {log.score_change}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logReason}>{log.reason}</Text>
                    <Text style={styles.logTime}>{formatRelativeTime(log.created_at)}</Text>
                  </View>
                  <Text style={styles.logAfter}>เหลือ {log.score_after}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.logWrap}>
              <Text style={styles.noLog}>ยังไม่มีประวัติการเปลี่ยนคะแนน</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * เกณฑ์คะแนน 1 ข้อ : ไอคอน + คำอธิบาย + ตัวเลขที่เปลี่ยน
 *
 * จัดให้ตัวเลขชิดขวาเป็นแนวเดียวกันทุกบรรทัด สายตาจึงกวาดเทียบได้ในทีเดียว
 * ว่าอะไรได้เพิ่ม อะไรโดนหัก โดยไม่ต้องอ่านทุกตัวอักษร
 */
function ScoreRule({
  icon,
  color,
  text,
  delta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
  delta: string;
}): JSX.Element {
  return (
    <View style={styles.ruleRow}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.ruleText}>{text}</Text>
      <Text style={[styles.ruleDelta, { color }]}>{delta}</Text>
    </View>
  );
}

/** แถวข้อมูล 1 บรรทัด มีไอคอนนำหน้า */
function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}): JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },

  cover: { width: '100%', height: 160, backgroundColor: theme.colors.surfaceAlt },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  coverHint: { ...theme.textStyles.caption },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    marginBottom: 0,
    ...theme.shadows.card,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  storeName: { ...theme.textStyles.title, fontSize: 20, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  ratingText: { ...theme.textStyles.caption },
  dot: { ...theme.textStyles.caption },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  infoText: { ...theme.textStyles.caption, flex: 1 },

  sectionTitle: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },

  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },

  /*
    alignItems: 'baseline' ทำให้เลขใหญ่กับ "/ 100" นั่งอยู่บนเส้นบรรทัดเดียวกัน
    ถ้าใช้ 'center' ตัว "/ 100" จะลอยอยู่กลางความสูงของเลขใหญ่ ซึ่งดูเหมือนวางผิดที่
  */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  score: {
    fontSize: 34,
    fontFamily: theme.fonts.bold,
    /*
      lineHeight ต้องสูงกว่า fontSize พอสมควร
      ฟอนต์ Prompt มีหางตัวอักษรไทยทั้งบนและล่าง ถ้ากล่องบรรทัดพอดีเป๊ะกับ fontSize
      Android จะตัดส่วนที่ล้นออก ตัวเลขจึงดูแหว่ง
    */
    lineHeight: 42,
  },
  scoreMax: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textMuted,
  },

  behaviorBadge: {
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  behaviorText: {
    ...theme.textStyles.caption,
    fontFamily: theme.fonts.medium,
  },

  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceAlt,
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  /* ขีดตั้งบาง ๆ บอกเส้น 40 คะแนน สีขาวเพื่อให้เห็นตัดกับแถบที่ทับอยู่ข้างหลัง */
  barMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.surface,
  },

  rules: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 7,
  },
  ruleText: { ...theme.textStyles.caption, color: theme.colors.textSecondary, flex: 1 },
  ruleDelta: {
    ...theme.textStyles.caption,
    fontFamily: theme.fonts.bold,
    fontVariant: ['tabular-nums'],
  },

  thresholdHint: { ...theme.textStyles.caption, marginTop: theme.spacing.sm, lineHeight: 18 },

  logWrap: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  logTitle: { ...theme.textStyles.caption, fontFamily: theme.fonts.medium, marginBottom: theme.spacing.xs },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 6,
  },
  logChange: { ...theme.textStyles.body, fontFamily: theme.fonts.bold, width: 34 },
  logReason: { ...theme.textStyles.caption, color: theme.colors.textPrimary },
  logTime: { ...theme.textStyles.caption, color: theme.colors.textMuted },
  logAfter: { ...theme.textStyles.caption },
  noLog: { ...theme.textStyles.caption },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  warnText: { ...theme.textStyles.caption, color: theme.colors.warningText, flex: 1 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  errorText: { ...theme.textStyles.caption, color: theme.colors.error, flex: 1 },
});
