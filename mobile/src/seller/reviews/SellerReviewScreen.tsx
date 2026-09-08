/**
 * รีวิวและคะแนนของร้าน (ใช้ได้จริงแล้ว)
 *
 * ร้านเข้ามาดูว่าลูกค้าพูดถึงร้านตัวเองว่าอย่างไร
 *
 * *** ตั้งใจให้เห็นรีวิวแย่ก่อน ***
 * มีปุ่มกรอง "ต้องปรับปรุง" ไว้ให้ เพราะรีวิว 5 ดาวอ่านแล้วสบายใจ
 * แต่รีวิว 1-2 ดาวคือสิ่งที่ร้านต้องเห็นและแก้ไข
 *
 * API : GET /api/stores/me         (เอา store_id ของตัวเอง)
 *       GET /api/stores/:id/reviews
 */
import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Review } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import RatingSummary from '../../features/store/components/RatingSummary';
import ReviewItem from '../../features/store/components/ReviewItem';

import storeService from '../services/storeService';
import reviewService from '../../features/review/reviewService';
import type { StoreReviews } from '../../features/review/reviewService';
import { errorMessage } from '../../core/services/apiClient';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

/** ตัวกรอง : ทั้งหมด / ต้องปรับปรุง (1-2 ดาว) / ชื่นชม (4-5 ดาว) */
type ReviewFilter = 'all' | 'bad' | 'good';

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'bad', label: 'ต้องปรับปรุง' },
  { value: 'good', label: 'ชื่นชม' },
];

export default function SellerReviewScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [reviews, setReviews] = useState<StoreReviews | null>(null);
  const [average, setAverage] = useState(0);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      // ต้องรู้ store_id ของตัวเองก่อน จึงจะดึงรีวิวของร้านได้
      const { store } = await storeService.getMyStore();
      setAverage(Number(store.rating));
      setReviews(await reviewService.listByStore(store.store_id));
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

  const filtered: Review[] = useMemo(() => {
    if (reviews === null) return [];
    if (filter === 'bad') return reviews.items.filter((r) => r.rating <= 2);
    if (filter === 'good') return reviews.items.filter((r) => r.rating >= 4);
    return reviews.items;
  }, [reviews, filter]);

  const badCount = useMemo(
    () => (reviews === null ? 0 : reviews.items.filter((r) => r.rating <= 2).length),
    [reviews]
  );

  if (loading) return <LoadingView message="กำลังโหลดรีวิว..." />;

  if (reviews === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="cloud-offline-outline"
          title="โหลดรีวิวไม่สำเร็จ"
          message={error ?? 'ลองใหม่อีกครั้ง'}
          actionLabel="ลองใหม่"
          onAction={() => { void handleRefresh(); }}
        />
      </ScreenContainer>
    );
  }

  if (reviews.total === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="star-outline"
          title="ยังไม่มีรีวิว"
          message="เมื่อลูกค้ามารับอาหารเรียบร้อยแล้ว จะเขียนรีวิวให้ร้านได้ รีวิวจะมาแสดงที่นี่"
        />
      </ScreenContainer>
    );
  }

  const header = (
    <View>
      <RatingSummary average={average} total={reviews.total} breakdown={reviews.breakdown} />

      {badCount > 0 ? (
        <View style={styles.warnBox}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warningText} />
          <Text style={styles.warnText}>
            มีรีวิว 1-2 ดาวอยู่ {badCount} รายการ ลองอ่านดูว่าลูกค้าติดขัดเรื่องอะไร
          </Text>
        </View>
      ) : null}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.review_id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void handleRefresh(); }} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="filter-outline"
            title="ไม่มีรีวิวในหมวดนี้"
            message={
              filter === 'bad'
                ? 'ยังไม่มีรีวิว 1-2 ดาว ถือเป็นข่าวดี'
                : 'ลองเปลี่ยนตัวกรองดู'
            }
          />
        }
        /*
         * ส่ง onReport เข้าไป ปุ่ม "แจ้งรีวิวนี้" จึงโผล่เฉพาะฝั่งร้าน
         * Backend กันไว้อยู่แล้วว่าคนเขียนรีวิวเองแจ้งรีวิวตัวเองไม่ได้
         */
        renderItem={({ item }) => (
          <ReviewItem
            review={item}
            onReport={() =>
              navigation.navigate('Report', {
                targetType: 'review',
                targetId: item.review_id,
                targetName: `รีวิว ${String(item.rating)} ดาว จาก ${item.customer_name ?? 'ลูกค้า'}`,
              })
            }
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  warnText: { ...theme.textStyles.caption, color: theme.colors.warningText, flex: 1 },

  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { ...theme.textStyles.caption, color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },
});
