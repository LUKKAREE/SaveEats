/**
 * การแจ้งเตือน (ใช้ได้จริงแล้ว)
 *
 * ใช้ร่วมกันทั้งฝั่งลูกค้าและฝั่งร้าน (ลงทะเบียนไว้ทั้งสอง stack)
 *
 * *** กดที่รายการแล้วต้องพาไปที่เกี่ยวข้อง ***
 * การแจ้งเตือนที่กดแล้วไม่ไปไหน ผู้ใช้จะเลิกกดตั้งแต่ครั้งที่สาม
 * ref_id คือ id ของสิ่งที่ถูกอ้างถึง เอามาใช้พาไปหน้าปลายทางได้เลย
 *
 * *** จัดกลุ่มตามวัน ***
 * วันนี้ / เมื่อวาน / วันที่เท่าไหร่
 * คนอ่านการแจ้งเตือนแบบไล่จากใหม่ไปเก่า การมีหัวข้อวันคั่นทำให้กวาดตาหาได้เร็วกว่ามาก
 *
 * API : GET    /api/notifications
 *       PUT    /api/notifications/:id/read
 *       PUT    /api/notifications/read-all
 *       DELETE /api/notifications/:id
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppNotification, NotificationType } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';

import notificationService from '../../../core/services/notificationService';
import { errorMessage } from '../../../core/services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useBadges } from '../../../context/BadgeContext';
import { formatRelativeTime } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerStackParamList } from '../../../navigation/types';

/**
 * หน้านี้อยู่ในทั้งสอง stack แต่ปลายทางที่กดไปได้มีแต่ของฝั่งลูกค้า
 * ฝั่งร้านจึงไม่พาไปไหน (เช็คด้วย isSeller ก่อนกด)
 */
type Navigation = NativeStackNavigationProp<CustomerStackParamList>;

/** ไอคอนและสีของแต่ละประเภท ประกาศเป็น Record เพื่อบังคับให้ครบทุกประเภท */
const TYPE_STYLE: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  reservation: { icon: 'receipt-outline', bg: theme.colors.primaryLight, color: theme.colors.primaryDark },
  store: { icon: 'storefront-outline', bg: theme.colors.infoBg, color: theme.colors.info },
  review: { icon: 'star-outline', bg: theme.colors.warningBg, color: theme.colors.warningText },
  report: { icon: 'flag-outline', bg: theme.colors.errorBg, color: theme.colors.error },
  system: { icon: 'information-circle-outline', bg: theme.colors.surfaceAlt, color: theme.colors.textSecondary },
};

/**
 * แปลงเวลาเป็นชื่อกลุ่ม : วันนี้ / เมื่อวาน / วันที่จริง
 *
 * เทียบกันที่ "วันปฏิทิน" ไม่ใช่จำนวนชั่วโมงที่ผ่านไป
 * แจ้งเตือนตอน 23:50 เมื่อคืน ต้องอยู่กลุ่ม "เมื่อวาน" ไม่ใช่ "วันนี้"
 * ถึงจะห่างกันแค่ไม่กี่ชั่วโมงก็ตาม
 */
function dayLabel(value: string): string {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'ไม่ทราบวันที่';

  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (diffDays <= 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';

  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' });
}

export default function NotificationScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { isSeller } = useAuth();
  const { setUnreadNotifications } = useBadges();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** โหมดแก้ไข = โชว์ปุ่มถังขยะข้างแต่ละรายการ */
  const [editing, setEditing] = useState(false);

  /**
   * จัดกลุ่มตามวัน
   *
   * รายการจาก backend เรียงจากใหม่ไปเก่ามาแล้ว จึงแค่ไล่ใส่กลุ่มตามลำดับ
   * ไม่ต้องเรียงใหม่ และกลุ่มจะออกมาเรียงถูกเองโดยอัตโนมัติ
   */
  const sections = useMemo(() => {
    const groups = new Map<string, AppNotification[]>();

    for (const n of items) {
      const label = dayLabel(n.created_at);
      const bucket = groups.get(label);
      if (bucket) bucket.push(n);
      else groups.set(label, [n]);
    }

    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [items]);

  /*
   * เก็บจำนวนที่ยังไม่อ่าน "ล่าสุด" ไว้ใน ref
   * เพราะ handlePress อ่านค่าจาก state ตรง ๆ ไม่ได้ (ค่าจะเป็นของรอบ render ก่อนหน้า
   * ถ้าผู้ใช้กดรัว ๆ หลายรายการติดกัน จุดแดงจะลดแค่ครั้งเดียว)
   */
  const unreadCountRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const res = await notificationService.list(1, 50);
      setItems(res.data);
      // เอาจำนวนที่ยังไม่อ่านจากชุดที่เพิ่งโหลดมาอัปจุดแดงเลย ไม่ต้องยิง API ซ้ำอีกเส้น
      setUnreadNotifications(res.data.filter((n) => !n.is_read).length);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [setUnreadNotifications]);

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

  async function handleReadAll(): Promise<void> {
    // อัปเดตหน้าจอทันทีไม่ต้องรอ server ตอบ ผู้ใช้จะรู้สึกว่าแอปไว
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadNotifications(0);
    try {
      await notificationService.markAllRead();
    } catch {
      // ถ้าพลาด ค่อยดึงของจริงกลับมาแสดง
      await load();
    }
  }

  function handlePress(item: AppNotification): void {
    // อ่านแล้วก็ทำเครื่องหมายไว้เลย ไม่ต้องรอผลจาก server
    if (!item.is_read) {
      setItems((prev) =>
        prev.map((n) => (n.notification_id === item.notification_id ? { ...n, is_read: 1 } : n))
      );
      // ลดจุดแดงลงทีละ 1 ทันที (กันติดลบด้วย Math.max เผื่อกดรัว ๆ)
      setUnreadNotifications(Math.max(0, unreadCountRef.current - 1));
      void notificationService.markRead(item.notification_id).catch(() => undefined);
    }

    /*
     * เรื่องร้องเรียนพาไปหน้า "เรื่องที่ฉันแจ้ง" ได้ทั้งสองฝั่ง
     * เพราะเป็นหน้าเดียวที่มีชื่อเหมือนกันและไม่ต้องส่ง parameter
     * จึงเช็คก่อน isSeller ต่างจากประเภทอื่นที่มีเฉพาะ stack ของลูกค้า
     */
    if (item.type === 'report') {
      navigation.navigate('MyReports');
      return;
    }

    // พาไปหน้าที่เกี่ยวข้อง (เฉพาะฝั่งลูกค้า เพราะ stack ของร้านมีหน้าไม่เหมือนกัน)
    if (isSeller || item.ref_id === null) return;

    if (item.type === 'reservation') {
      navigation.navigate('ReservationDetail', { reservationId: item.ref_id });
    } else if (item.type === 'store') {
      navigation.navigate('StoreDetail', { storeId: item.ref_id });
    }
  }

  /**
   * ยืนยันก่อนลบ
   * การลบการแจ้งเตือนกู้คืนไม่ได้ จึงต้องถามก่อนเสมอ
   */
  function confirmRemove(item: AppNotification): void {
    Alert.alert('ลบการแจ้งเตือน', `ลบ "${item.title}" ออกจากรายการ?`, [
      { text: 'ไม่ลบ', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            // เอาออกจากหน้าจอก่อน ผู้ใช้จะได้ไม่ต้องรอ
            const backup = items;
            setItems((prev) => prev.filter((n) => n.notification_id !== item.notification_id));
            try {
              await notificationService.remove(item.notification_id);
            } catch (err) {
              setItems(backup);
              Alert.alert('ลบไม่สำเร็จ', errorMessage(err));
            }
          })();
        },
      },
    ]);
  }

  const unreadCount = items.filter((n) => !n.is_read).length;
  // ให้ ref ตามหลัง state เสมอ handlePress จะได้อ่านค่าที่เป็นปัจจุบันจริง ๆ
  unreadCountRef.current = unreadCount;

  if (loading) return <LoadingView message="กำลังโหลดการแจ้งเตือน..." />;

  return (
    <ScreenContainer padded={false}>
      <View style={styles.topBar}>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => { void handleReadAll(); }}>
            <Text style={styles.readAll}>อ่านทั้งหมด ({unreadCount})</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.unreadText}>อ่านครบแล้ว</Text>
        )}

        {items.length > 0 ? (
          <TouchableOpacity
            onPress={() => setEditing((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
          >
            <Text style={styles.readAll}>{editing ? 'เสร็จสิ้น' : 'แก้ไข'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.notification_id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void handleRefresh(); }} />
        }
        ListEmptyComponent={
          error !== null ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="โหลดไม่สำเร็จ"
              message={error}
              actionLabel="ลองใหม่"
              onAction={() => { void handleRefresh(); }}
            />
          ) : (
            <EmptyState
              icon="notifications-outline"
              title="ยังไม่มีการแจ้งเตือน"
              message="เมื่อมีความเคลื่อนไหวเกี่ยวกับการจองหรือร้านค้า จะแจ้งให้ทราบที่นี่"
            />
          )
        }
        renderItem={({ item }) => {
          const style = TYPE_STYLE[item.type];
          return (
            <TouchableOpacity
              style={[styles.card, item.is_read ? null : styles.cardUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon} size={20} color={style.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.title, item.is_read ? null : styles.titleUnread]}>
                  {item.title}
                </Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
              </View>

              {/* โหมดแก้ไขโชว์ถังขยะ ปกติโชว์จุดว่ายังไม่ได้อ่าน */}
              {editing ? (
                <TouchableOpacity
                  onPress={() => { confirmRemove(item); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              ) : item.is_read ? null : (
                <View style={styles.dot} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unreadText: { ...theme.textStyles.caption },
  readAll: { ...theme.textStyles.caption, color: theme.colors.primary, fontFamily: theme.fonts.medium },

  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  sectionHeader: {
    ...theme.textStyles.subheading,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardUnread: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },

  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.textStyles.body },
  titleUnread: { fontFamily: theme.fonts.semiBold },
  message: { ...theme.textStyles.caption, marginTop: 2 },
  time: { ...theme.textStyles.caption, color: theme.colors.textMuted, marginTop: 4 },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
});
