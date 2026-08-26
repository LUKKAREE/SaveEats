/**
 * รีวิวของฉัน (ฝั่งลูกค้า)
 *
 * ลูกค้าเข้ามาดูรีวิวทั้งหมดที่ตัวเองเคยเขียนไว้ เรียงจากใหม่ไปเก่า
 *
 * API : GET /api/reviews/my
 *
 * *** ทำไมไม่ใช้ ReviewItem ตัวเดียวกับหน้าร้าน ***
 * ReviewItem โชว์ "ใครเป็นคนเขียน" (รูปกับชื่อลูกค้า) ซึ่งถูกต้องเวลาร้านอ่านรีวิวตัวเอง
 * แต่หน้านี้ทุกรีวิวเป็นของคนอ่านเองทั้งหมด การโชว์ชื่อตัวเองซ้ำทุกใบไม่ได้บอกอะไรเลย
 * สิ่งที่ลูกค้าอยากรู้คือ "รีวิวนี้ให้ร้านไหน" จึงสลับมาโชว์รูปกับชื่อร้านแทน
 *
 * *** แตะการ์ดแล้วเข้าหน้าร้าน ***
 * คนที่เปิดหน้านี้มักกำลังนึกว่า "ร้านที่เคยกินแล้วชอบชื่ออะไรนะ"
 * ให้กดเข้าไปดูของที่ร้านลงขายวันนี้ต่อได้เลย จะได้ไม่ต้องไปค้นหาใหม่เอง
 */
import { useCallback, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Review } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';

import reviewService from '../reviewService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { formatRelativeTime } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerStackParamList } from '../../../navigation/types';

type Navigation = NativeStackNavigationProp<CustomerStackParamList>;

export default function MyReviewsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setReviews(await reviewService.listMine());
    } catch (err) {
      setError(errorMessage(err));
      setReviews(null);
    }
  }, []);

  /*
   * ใช้ useFocusEffect ไม่ใช่ useEffect
   * เพราะลูกค้าอาจเพิ่งเขียนรีวิวใหม่แล้วกดย้อนกลับมาหน้านี้
   * useEffect จะไม่ทำงานซ้ำ ทำให้รีวิวที่เพิ่งเขียนไม่โผล่ ผู้ใช้จะนึกว่าเขียนไม่สำเร็จ
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

  if (loading) return <LoadingView message="กำลังโหลดรีวิวของคุณ..." />;

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

  if (reviews.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="star-outline"
          title="ยังไม่เคยเขียนรีวิว"
          message="หลังจากไปรับอาหารที่ร้านเรียบร้อยแล้ว จะเขียนรีวิวให้ร้านได้จากหน้ารายละเอียดการจอง"
          actionLabel="ดูการจองของฉัน"
          onAction={() => navigation.navigate('CustomerTabs', { screen: 'ReservationHistory' })}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.review_id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void handleRefresh(); }} />
        }
        ListHeaderComponent={
          <Text style={styles.summary}>
            คุณเขียนรีวิวไปแล้ว {reviews.length} ร้าน
          </Text>
        }
        renderItem={({ item }) => {
          const logo = imageUrl(item.store_image ?? null, 'store');

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('StoreDetail', { storeId: item.store_id })}
            >
              <View style={styles.header}>
                {logo !== null ? (
                  <Image source={{ uri: logo }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoEmpty]}>
                    <Ionicons name="storefront" size={18} color={theme.colors.primary} />
                  </View>
                )}

                <View style={styles.headerText}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {item.store_name ?? `ร้าน #${item.store_id}`}
                  </Text>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= item.rating ? 'star' : 'star-outline'}
                        size={13}
                        color={theme.colors.accent}
                      />
                    ))}
                    <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </View>

              {item.comment !== null && item.comment.trim() !== '' ? (
                <Text style={styles.comment}>{item.comment}</Text>
              ) : (
                // ให้ดาวอย่างเดียวไม่พิมพ์อะไรก็ได้ ต้องไม่ปล่อยการ์ดโล่งจนดูเหมือนโหลดไม่ขึ้น
                <Text style={styles.noComment}>ให้คะแนนโดยไม่ได้เขียนข้อความ</Text>
              )}
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

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headerText: { flex: 1 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  logoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  storeName: { ...theme.textStyles.subheading },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
  time: { ...theme.textStyles.caption, marginLeft: theme.spacing.sm },
  comment: { ...theme.textStyles.body, marginTop: theme.spacing.sm },
  noComment: {
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
