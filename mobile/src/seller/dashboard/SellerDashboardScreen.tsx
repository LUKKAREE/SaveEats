/**
 * หน้าหลักของร้านค้า
 * รวมตัวเลขสำคัญของวันนี้ + ปุ่มลัดไปงานที่ทำบ่อย
 */
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MyStorePayload, ReservationDetail } from '@shared/index';
import { BEHAVIOR_STATUS_LABEL } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import AppButton from '../../components/AppButton';

import storeService from '../services/storeService';
import postService from '../services/postService';
import reservationService from '../../features/reservation/reservationService';
import { errorMessage } from '../../core/services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

interface DashboardData {
  store: MyStorePayload;
  activePosts: number;
  waitingReservations: ReservationDetail[];
}

export default function SellerDashboardScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const store = await storeService.getMyStore();

      // ร้านที่ยังไม่อนุมัติจะเรียก /posts/my และ /store/reservations ไม่ได้
      // (Backend บล็อกไว้ที่ requireOwnStore) จึงต้องเช็คสถานะก่อน
      if (store.store.status !== 'approved') {
        setData({ store, activePosts: 0, waitingReservations: [] });
        return;
      }

      const [posts, reservations] = await Promise.all([
        postService.listMine(),
        reservationService.listForStore('confirmed'),
      ]);

      setData({
        store,
        activePosts: posts.filter((p) => p.status === 'active').length,
        waitingReservations: reservations,
      });
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

  if (loading) {
    return <ScreenContainer><LoadingView message="กำลังโหลดข้อมูลร้าน..." /></ScreenContainer>;
  }

  if (error !== null || data === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="cloud-offline-outline"
          title="โหลดข้อมูลไม่สำเร็จ"
          message={error ?? 'ไม่พบข้อมูลร้าน'}
          actionLabel="ลองอีกครั้ง"
          onAction={() => { void handleRefresh(); }}
        />
      </ScreenContainer>
    );
  }

  const { store, behavior } = { store: data.store.store, behavior: data.store.behavior };
  const isApproved = store.status === 'approved';
  const behaviorColor =
    behavior.score >= 70 ? theme.colors.success
      : behavior.score >= 40 ? theme.colors.warning
        : theme.colors.error;

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void handleRefresh(); }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ---- ทักทาย ---- */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{store.store_name}</Text>
            <Text style={styles.subGreeting}>สวัสดี {user?.name ?? 'คุณ'}</Text>
          </View>
          <StatusBadge status={store.status} type="store" />
        </View>

        {/* ---- ร้านยังไม่อนุมัติ ---- */}
        {!isApproved ? (
          <View style={styles.pendingBox}>
            <Ionicons name="hourglass-outline" size={24} color={theme.colors.warningText} />
            <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
              <Text style={styles.pendingTitle}>
                {store.status === 'pending' ? 'ร้านกำลังรอการอนุมัติ' : 'ร้านยังลงขายไม่ได้'}
              </Text>
              <Text style={styles.pendingText}>
                {store.status === 'pending'
                  ? 'ผู้ดูแลระบบกำลังตรวจสอบข้อมูลร้าน จะแจ้งผลให้ทราบในแอป'
                  : store.reject_reason ?? 'กรุณาติดต่อผู้ดูแลระบบ'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ---- ตัวเลขสรุป ---- */}
        <View style={styles.statRow}>
          <StatCard
            icon="receipt-outline"
            value={String(data.waitingReservations.length)}
            label="รอมารับ"
            tone={data.waitingReservations.length > 0 ? 'accent' : 'primary'}
            onPress={() => navigation.navigate('SellerTabs', { screen: 'SellerReservations' })}
          />
          <StatCard
            icon="newspaper-outline"
            value={String(data.activePosts)}
            label="โพสต์ที่กำลังขาย"
            tone="primary"
            onPress={() => navigation.navigate('SellerTabs', { screen: 'SellerPosts' })}
          />
        </View>

        <View style={styles.statRow}>
          <StatCard
            icon="star-outline"
            value={Number(store.rating) > 0 ? Number(store.rating).toFixed(1) : '-'}
            label={`คะแนนร้าน (${store.review_count} รีวิว)`}
            tone="primary"
            onPress={() => navigation.navigate('SellerReviews')}
          />
          <StatCard
            icon="shield-checkmark-outline"
            value={String(behavior.score)}
            label={`ความประพฤติ: ${BEHAVIOR_STATUS_LABEL[behavior.status]}`}
            tone="custom"
            customColor={behaviorColor}
          />
        </View>

        {/* ---- ปุ่มลัด ---- */}
        {isApproved ? (
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>ทำอะไรต่อดี</Text>

            <AppButton
              title="สร้างโพสต์ขายใหม่"
              icon={<Ionicons name="add" size={20} color={theme.colors.textOnPrimary} />}
              onPress={() => navigation.navigate('SellerPostForm')}
            />

            <AppButton
              title="จัดการคลังเมนู"
              variant="outline"
              onPress={() => navigation.navigate('SellerFoods')}
              style={{ marginTop: theme.spacing.sm }}
            />

            <AppButton
              title="กรอกรหัส 4 หลักรับอาหาร"
              variant="outline"
              onPress={() => navigation.navigate('SellerEnterCode')}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        ) : (
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>ระหว่างรออนุมัติ</Text>
            <Text style={styles.waitHint}>
              เตรียมเมนูไว้ก่อนได้ พออนุมัติแล้วจะโพสต์ขายได้ทันที
            </Text>
            <AppButton
              title="ดูข้อมูลร้าน"
              variant="outline"
              onPress={() => navigation.navigate('SellerStore')}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        )}

        {/* ---- คลังเมนูสรุป ---- */}
        <View style={styles.actionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>คลังเมนู</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SellerFoods')}>
              <Text style={styles.linkText}>ดูทั้งหมด</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.waitHint}>
            มีเมนูในคลัง {data.store.foods.length} รายการ
            {data.store.foods.length === 0 ? '  (เพิ่มเมนูก่อนถึงจะโพสต์ขายได้)' : ''}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone: 'primary' | 'accent' | 'custom';
  customColor?: string;
  onPress?: () => void;
}

function StatCard({ icon, value, label, tone, customColor, onPress }: StatCardProps): JSX.Element {
  const color =
    tone === 'accent' ? theme.colors.accent
      : tone === 'custom' ? (customColor ?? theme.colors.primary)
        : theme.colors.primary;

  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={onPress === undefined}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  greeting: { ...theme.textStyles.title, fontSize: 22 },
  subGreeting: { ...theme.textStyles.bodyMuted },

  pendingBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pendingTitle: {
    ...theme.textStyles.subheading,
    color: theme.colors.warningText,
  },
  pendingText: { ...theme.textStyles.caption, color: theme.colors.warningText },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  statValue: { ...theme.textStyles.title, fontSize: 28, marginTop: theme.spacing.xs },
  statLabel: { ...theme.textStyles.caption },

  actionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  sectionTitle: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { ...theme.textStyles.bodyMuted, color: theme.colors.primary },
  waitHint: { ...theme.textStyles.caption },
});
