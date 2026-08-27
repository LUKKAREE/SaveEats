/**
 * การจองของฉัน (ฝั่งลูกค้า)
 *
 * หน้านี้อยู่ในแท็บที่ 3 ของเมนูล่าง และเป็นปลายทางหลังจองสำเร็จ
 * ลูกค้าเข้ามาที่นี่เพื่อเปิด QR ดูซ้ำตอนไปถึงร้าน
 *
 * หลัก UX
 *   - รายการที่ยังต้องไปรับ (confirmed) ต้องเด่นที่สุด จึงมีกรอบเขียวและนับเวลาถอยหลัง
 *   - มีแท็บกรองสถานะ ใช้ข้อความไทยจาก @shared/index ตัวเดียวกับ Admin Web
 *
 * *** ทำไมหน้านี้ต้องเรนเดอร์โครงเดียวตลอด ***
 *
 * เดิมหน้านี้คืนค่าคนละโครงกันระหว่างตอนโหลดกับตอนโหลดเสร็จ
 *     ตอนโหลด      <ScreenContainer>              + แถบกรอง + สปินเนอร์
 *     โหลดเสร็จ    <ScreenContainer padded={false}> + FlatList (แถบกรองอยู่ในหัวลิสต์)
 *
 * React เทียบต้นไม้สองอันนี้แล้วเห็นว่าคนละโครง จึงถอดของเก่าทิ้งทั้งชุด
 * แล้วสร้างใหม่หมด แถบกรองสถานะจึงถูก unmount แล้ว mount ใหม่ ต้องวัดขนาดใหม่
 * พร้อมกันนั้นระยะขอบก็เปลี่ยนจาก "มี" เป็น "ไม่มี" ในเฟรมเดียว
 * ผลคือเห็นหน้าจอกระตุกและยืดผิดรูปหนึ่งแวบ ทุกครั้งที่กดเข้าแท็บนี้
 *
 * ตอนนี้เหลือโครงเดียวตลอดชีวิตของหน้า เปลี่ยนแค่ "ข้างใน" ของ FlatList ตัวเดิม
 * ตำแหน่งและระยะขอบของทุกอย่างจึงนิ่งสนิทตั้งแต่เฟรมแรก
 */
import { useCallback, useRef, useState } from 'react';
import {
  View, Text, Image, FlatList, ScrollView,
  TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReservationDetail, ReservationStatus } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';
import StatusBadge from '../../../components/StatusBadge';

import reservationService from '../reservationService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { formatPrice, formatPickupRange, formatTimeLeft } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import { useBadges } from '../../../context/BadgeContext';
import type { CustomerStackParamList } from '../../../navigation/types';

type Navigation = NativeStackNavigationProp<CustomerStackParamList>;

/** แท็บกรอง : '' คือดูทั้งหมด */
const FILTERS: Array<{ value: ReservationStatus | ''; label: string }> = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'confirmed', label: 'ต้องไปรับ' },
  { value: 'completed', label: 'รับแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
  { value: 'expired', label: 'หมดอายุ' },
];

export default function ReservationHistoryScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [items, setItems] = useState<ReservationDetail[]>([]);
  const [filter, setFilter] = useState<ReservationStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * ตอนนี้มีรายการค้างอยู่บนจอหรือยัง
   *
   * *** ทำไมเก็บใน useRef ไม่ใช่อ่านจาก items ตรง ๆ ***
   * ค่านี้ถูกอ่านข้างใน useFocusEffect ถ้าอ่านจาก items จะต้องใส่ items
   * เป็น dependency ของ useCallback ซึ่งจะทำให้ effect ยิงใหม่ทุกครั้งที่ข้อมูลเปลี่ยน
   * กลายเป็นโหลดวนไม่รู้จบ (โหลดเสร็จ -> items เปลี่ยน -> effect ยิง -> โหลดอีก)
   *
   * useRef เก็บค่าไว้ข้ามการเรนเดอร์ได้เหมือน useState แต่ไม่กระตุ้นให้เรนเดอร์ใหม่
   * จึงเหมาะกับค่าที่ใช้ "ตัดสินใจ" อย่างเดียว ไม่ได้เอาไปแสดงผล
   */
  const hasItems = useRef(false);

  // ตัวเลขบนแท็บ "การจอง" ต้องขยับตามหลังทุกครั้งที่รายการเปลี่ยน (จอง / ยกเลิก / ร้านสแกนแล้ว)
  const { refresh: refreshBadges } = useBadges();

  /** ยิง API อย่างเดียว ไม่ยุ่งกับ state อื่น คืน null ถ้าพลาด */
  const fetchList = useCallback(
    async (status: ReservationStatus | ''): Promise<ReservationDetail[] | null> => {
      try {
        return await reservationService.listMine(status);
      } catch (err) {
        setError(errorMessage(err));
        return null;
      }
    },
    []
  );

  /** เอาผลลัพธ์ที่ได้ลงจอ พร้อมจำไว้ว่าตอนนี้มีของอยู่หรือเปล่า */
  const apply = useCallback(
    (list: ReservationDetail[] | null): void => {
      const next = list ?? [];
      hasItems.current = next.length > 0;
      setItems(next);
      void refreshBadges();
    },
    [refreshBadges]
  );

  // useFocusEffect = โหลดใหม่ทุกครั้งที่กลับมาที่แท็บนี้
  // จำเป็นมาก เพราะพอร้านสแกน QR เสร็จ สถานะจะเปลี่ยนเป็น completed
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        /*
         * *** โหลดเงียบถ้ามีของเดิมอยู่แล้ว ***
         * เดิมสั่ง setLoading(true) ทุกครั้งที่เข้าแท็บ รายการที่เห็นอยู่จะถูกล้าง
         * ทิ้งเป็นสปินเนอร์ก่อน แล้วค่อยวาดกลับมาใหม่ = กระพริบทุกครั้งที่กด
         *
         * ตอนนี้แสดงสปินเนอร์เฉพาะตอนที่ยังไม่มีอะไรให้ดูเลยจริง ๆ
         * นอกนั้นให้ของเดิมค้างอยู่ แล้วสลับเป็นข้อมูลใหม่ตอนที่มาถึง
         */
        if (!hasItems.current) setLoading(true);
        setError(null);

        const list = await fetchList(filter);
        if (!active) return;

        apply(list);
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [fetchList, apply, filter])
  );

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    setError(null);
    apply(await fetchList(filter));
    setRefreshing(false);
  }

  /*
   * แถบกรองสถานะ
   *
   * *** ใช้ ScrollView ไม่ใช่ FlatList ***
   * FlatList มีระบบ virtualization คือค่อย ๆ วัดขนาดแล้วทยอยวาดทีละใบ
   * ซึ่งคุ้มมากกับลิสต์เป็นร้อยรายการ แต่แถบนี้มีแค่ 5 ปุ่มตายตัว
   * การวัดแบบทยอยจึงกลายเป็นข้อเสียล้วน ๆ เพราะเห็นปุ่มขยับตอนเปิดหน้า
   *
   * ScrollView วาดลูกทั้งหมดจบในรอบเดียว ความกว้างจึงนิ่งตั้งแต่เฟรมแรก
   */
  const header = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTERS.map((item) => {
        const active = filter === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            style={[styles.filterChip, active ? styles.filterChipActive : null]}
            onPress={() => setFilter(item.value)}
          >
            <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.reservation_id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
        }
        /*
          ทั้งสปินเนอร์และหน้าว่างอยู่ในกล่องเดียวกันที่กินพื้นที่ที่เหลือทั้งหมด
          ทั้งสองอย่างจึงอยู่กึ่งกลางตำแหน่งเดียวกันเป๊ะ พอสลับกันจึงไม่มีอะไรกระโดด
        */
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {loading ? (
              <LoadingView message="กำลังโหลดการจอง..." />
            ) : error !== null ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="โหลดข้อมูลไม่สำเร็จ"
                message={error}
                actionLabel="ลองใหม่"
                onAction={() => void handleRefresh()}
              />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="ยังไม่มีการจอง"
                message="เมื่อจองอาหารแล้ว รายการจะมาแสดงที่นี่ พร้อม QR สำหรับไปรับที่ร้าน"
                actionLabel="ดูอาหารใกล้ฉัน"
                onAction={() => navigation.navigate('CustomerTabs', { screen: 'Home' })}
              />
            )}
          </View>
        }
        renderItem={({ item }) => {
          // confirmed = ยังต้องไปรับ ให้เน้นด้วยกรอบสีเขียว
          const pending = item.status === 'confirmed';
          // imageUrl คืน null ได้ ต้องแยกเช็คก่อน ส่ง null เข้า <Image> ไม่ได้
          const uri = imageUrl(item.image, 'food');
          return (
            <TouchableOpacity
              style={[styles.card, pending ? styles.cardPending : null]}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ReservationDetail', { reservationId: item.reservation_id })
              }
            >
              <View style={styles.row}>
                {uri !== null ? (
                  <Image source={{ uri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="fast-food-outline" size={22} color={theme.colors.textMuted} />
                  </View>
                )}

                <View style={styles.info}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.food_name}
                  </Text>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {item.store_name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.quantity} ชิ้น · {formatPrice(item.total_price)}
                  </Text>
                </View>

                <StatusBadge status={item.status} />
              </View>

              <View style={styles.footer}>
                <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
                <Text style={styles.pickup}>
                  {formatPickupRange(item.pickup_start, item.pickup_end)}
                </Text>
                {pending ? (
                  <Text style={styles.countdown}>{formatTimeLeft(item.expires_at)}</Text>
                ) : null}
              </View>

              {pending ? (
                <View style={styles.qrHint}>
                  <Ionicons name="qr-code-outline" size={15} color={theme.colors.primaryDark} />
                  <Text style={styles.qrHintText}>แตะเพื่อเปิด QR ให้ร้านสแกน</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  /*
    flexGrow: 1 ทำให้เนื้อในสูงเต็มจออย่างน้อยหนึ่งจอเสมอ
    ถ้าไม่ใส่ กล่องหน้าว่างที่เขียน flex: 1 จะสูงเป็น 0 เพราะไม่มีพื้นที่ให้ยืด
  */
  list: { flexGrow: 1, padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  emptyWrap: { flex: 1, justifyContent: 'center' },

  filterRow: { gap: theme.spacing.xs, paddingBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: { ...theme.textStyles.caption, color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardPending: { borderColor: theme.colors.primary, borderWidth: 1.5 },

  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  thumb: { width: 54, height: 54, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  foodName: { ...theme.textStyles.subheading },
  storeName: { ...theme.textStyles.caption },
  meta: { ...theme.textStyles.caption, color: theme.colors.textSecondary, marginTop: 2 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pickup: { ...theme.textStyles.caption, flex: 1 },
  countdown: { ...theme.textStyles.caption, color: theme.colors.warning, fontFamily: theme.fonts.medium },

  qrHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: theme.spacing.xs },
  qrHintText: { ...theme.textStyles.caption, color: theme.colors.primaryDark },
});
