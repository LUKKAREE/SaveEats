/**
 * ร้านโปรดของฉัน
 *
 * ร้านที่ลูกค้ากดหัวใจไว้ แสดงเป็นตาราง 2 คอลัมน์ตามแบบร่าง
 *
 * หลัก UX ที่ใช้
 *   - กดหัวใจซ้ำเพื่อเอาออกได้ทันทีจากหน้านี้ ไม่ต้องเข้าไปในร้านก่อน
 *   - เอาออกแล้วการ์ดหายทันที ไม่ต้องรอ server ตอบ (optimistic update)
 *     ถ้าเกิดพลาดขึ้นมาค่อยเอากลับคืนแล้วบอกผู้ใช้
 *   - โหลดใหม่ทุกครั้งที่กลับเข้าหน้านี้ เพราะอาจไปกดหัวใจมาจากหน้าร้าน
 */
import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';

import favoriteService from '../favoriteService';
import type { FavoriteStore } from '../favoriteService';
import locationService from '../../../core/services/locationService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { formatDistance, formatRating } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerStackParamList } from '../../../navigation/types';

type Navigation = NativeStackNavigationProp<CustomerStackParamList>;

export default function FavoriteStoresScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [stores, setStores] = useState<FavoriteStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      // ขอพิกัดแบบไม่บังคับ ไม่ได้ก็แค่ไม่มีระยะทางบนการ์ด ไม่ใช่เรื่องคอขาดบาดตาย
      const coords = await locationService.getCurrentPosition().catch(() => null);
      setStores(await favoriteService.list(coords));
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

  async function onRefresh(): Promise<void> {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  /** เอาร้านออกจากรายการโปรด */
  async function removeStore(store: FavoriteStore): Promise<void> {
    // เอาออกจากหน้าจอก่อนเลย ผู้ใช้จะได้ไม่ต้องรอ
    const backup = stores;
    setStores((prev) => prev.filter((s) => s.store_id !== store.store_id));

    try {
      await favoriteService.remove(store.store_id);
    } catch (err) {
      // พลาดก็เอากลับคืนให้เหมือนเดิม แล้วบอกไปตรง ๆ
      setStores(backup);
      Alert.alert('เอาออกไม่สำเร็จ', errorMessage(err));
    }
  }

  if (loading) {
    return <LoadingView message="กำลังโหลดร้านโปรด..." />;
  }

  return (
    <ScreenContainer padded={false}>
      {/* ---- หัวเรื่อง ---- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ร้านโปรดของฉัน</Text>
        <Text style={styles.headerSubtitle}>{stores.length} ร้าน</Text>
      </View>

      <FlatList
        data={stores}
        keyExtractor={(item) => String(item.store_id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh(); }} />
        }
        ListEmptyComponent={
          error !== null ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="โหลดร้านโปรดไม่สำเร็จ"
              message={error}
              actionLabel="ลองใหม่"
              onAction={() => { void onRefresh(); }}
            />
          ) : (
            <EmptyState
              icon="heart-outline"
              title="ยังไม่มีร้านโปรด"
              message="กดรูปหัวใจในหน้าร้านที่ชอบ ร้านนั้นจะมาอยู่ที่นี่ ไว้กลับมาดูได้เร็ว ๆ"
              actionLabel="ไปดูร้านอาหาร"
              onAction={() => navigation.navigate('CustomerTabs', { screen: 'Home' })}
            />
          )
        }
        renderItem={({ item }) => {
          const uri = imageUrl(item.image, 'store');
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('StoreDetail', { storeId: item.store_id })}
            >
              <View style={styles.thumbWrap}>
                {uri !== null ? (
                  <Image source={{ uri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="storefront" size={30} color={theme.colors.textMuted} />
                  </View>
                )}

                {/* ปุ่มหัวใจลอยมุมขวาบน กดเอาออกจากรายการโปรดได้เลย */}
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => { void removeStore(item); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="heart" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.body}>
                <Text style={styles.storeName} numberOfLines={1}>{item.store_name}</Text>
                <Text style={styles.address} numberOfLines={1}>
                  {item.address ?? 'ไม่ระบุที่อยู่'}
                </Text>

                <View style={styles.metaRow}>
                  {Number(item.rating) > 0 ? (
                    <Text style={styles.rating}>
                      ⭐ {formatRating(item.rating, item.review_count)}
                    </Text>
                  ) : (
                    <Text style={styles.ratingEmpty}>ยังไม่มีรีวิว</Text>
                  )}

                  {item.distance_km !== undefined && item.distance_km !== null ? (
                    <Text style={styles.distance}>{formatDistance(item.distance_km)}</Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: { ...theme.textStyles.title, fontSize: 22 },
  headerSubtitle: { ...theme.textStyles.caption, marginTop: 2 },

  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  row: { gap: theme.spacing.md },

  card: {
    flex: 1,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: '100%', height: 110, backgroundColor: theme.colors.surfaceAlt },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  heartButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },

  body: { padding: theme.spacing.sm + 2 },
  storeName: { ...theme.textStyles.subheading },
  address: { ...theme.textStyles.caption, marginTop: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  rating: { ...theme.textStyles.caption, color: theme.colors.textPrimary },
  ratingEmpty: { ...theme.textStyles.caption, color: theme.colors.textMuted },
  distance: { ...theme.textStyles.caption, color: theme.colors.textSecondary },
});
