/**
 * รายการจองที่เข้ามาที่ร้าน
 * มีแท็บกรองตามสถานะ และปุ่มลัดไปหน้าสแกน QR
 */
import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReservationDetail, ReservationStatus } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import AppButton from '../../components/AppButton';

import reservationService from '../../features/reservation/reservationService';
import { errorMessage } from '../../core/services/apiClient';
import { formatPrice, formatPickupRange } from '../../core/utils/formatters';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

/** แท็บกรอง : '' คือดูทั้งหมด */
const FILTERS: Array<{ value: ReservationStatus | ''; label: string }> = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'confirmed', label: 'รอมารับ' },
  { value: 'completed', label: 'รับแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
  { value: 'expired', label: 'หมดอายุ' },
];

export default function SellerReservationListScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [items, setItems] = useState<ReservationDetail[]>([]);
  const [filter, setFilter] = useState<ReservationStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: ReservationStatus | ''): Promise<void> => {
    try {
      setError(null);
      setItems(await reservationService.listForStore(status));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        await load(filter);
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [load, filter])
  );

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  }

  const header = (
    <View>
      <AppButton
        title="สแกน QR รับอาหาร"
        icon={<Ionicons name="qr-code-outline" size={20} color={theme.colors.textOnPrimary} />}
        onPress={() => navigation.navigate('SellerTabs', { screen: 'SellerScanQr' })}
        style={{ marginBottom: theme.spacing.md }}
      />

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => {
          const active = filter === item.value;
          return (
            <TouchableOpacity
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
              onPress={() => setFilter(item.value)}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer>
        {header}
        <LoadingView message="กำลังโหลดรายการจอง..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.reservation_id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void handleRefresh(); }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>
                  {item.food_name} x {item.quantity}
                </Text>
                <Text style={styles.customer}>
                  <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                  {'  '}{item.customer_name}
                  {item.customer_phone !== null ? `  ${item.customer_phone}` : ''}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.cardRow}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.rowText}>
                {formatPickupRange(item.pickup_start, item.pickup_end)}
              </Text>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.codeChip}>
                <Text style={styles.codeLabel}>รหัส</Text>
                <Text style={styles.codeValue}>{item.reservation_code}</Text>
              </View>
              <Text style={styles.total}>{formatPrice(item.total_price)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          error !== null ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="โหลดข้อมูลไม่สำเร็จ"
              message={error}
              actionLabel="ลองอีกครั้ง"
              onAction={() => { void handleRefresh(); }}
            />
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="ยังไม่มีการจอง"
              message="เมื่อลูกค้าจองอาหารของร้าน รายการจะขึ้นที่นี่ทันที พร้อมรหัส 4 หลักสำหรับยืนยัน"
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  filterRow: { paddingBottom: theme.spacing.md },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { ...theme.textStyles.bodyMuted, color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  foodName: { ...theme.textStyles.subheading },
  customer: { ...theme.textStyles.caption, marginTop: 2 },

  cardRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm },
  rowText: { ...theme.textStyles.caption, marginLeft: 4 },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  codeLabel: { ...theme.textStyles.caption, color: theme.colors.primaryDark },
  codeValue: {
    ...theme.textStyles.subheading,
    color: theme.colors.primaryDark,
    marginLeft: theme.spacing.xs,
    letterSpacing: 2,
  },
  total: { ...theme.textStyles.price, fontSize: 18 },
});
