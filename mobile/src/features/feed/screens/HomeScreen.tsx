/**
 * หน้า Feed หลักของลูกค้า
 *
 * สิ่งที่หน้านี้ทำ
 *   1. ดึงตำแหน่ง GPS (ถ้าผู้ใช้อนุญาต) เพื่อโชว์ระยะทางของแต่ละร้าน
 *   2. ดึงหมวดหมู่อาหารมาทำแถบเลื่อนด้านบน
 *   3. ดึงโพสต์จาก /api/posts แล้วแสดงเป็นการ์ด
 *   4. ดึงลงเพื่อรีเฟรช และเลื่อนถึงล่างเพื่อโหลดหน้าถัดไป
 *
 * หลัก UX ที่ใช้
 *   - แสดงสถานะให้ครบ 4 แบบ : กำลังโหลด / มีข้อมูล / ไม่มีข้อมูล / เกิดข้อผิดพลาด
 *   - ไม่ใช้ alert เด้ง แต่แสดง error ในหน้าพร้อมปุ่มลองใหม่
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Category, FeedItem } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';
import AppButton from '../../../components/AppButton';
import FoodPostCard from '../components/FoodPostCard';

import feedService from '../feedService';
import locationService from '../../../core/services/locationService';
import type { Coordinates } from '../../../core/services/locationService';
import { errorMessage } from '../../../core/services/apiClient';
import { theme } from '../../../core/theme/theme';
import { PAGE_SIZE } from '../../../core/constants/appConstants';
import { useAuth } from '../../../context/AuthContext';
import { useFilter } from '../../../context/FilterContext';
import { useBadges, badgeLabel } from '../../../context/BadgeContext';
import type { CustomerStackParamList } from '../../../navigation/types';

/**
 * หน้านี้อยู่ในแท็บ แต่ต้อง navigate ไปหน้าใน stack ได้ด้วย
 * จึงใช้ useNavigation พร้อมระบุชนิดเอง
 */
type Navigation = NativeStackNavigationProp<CustomerStackParamList>;

/** แถบหมวดหมู่ มีตัวเลือก "ทั้งหมด" เพิ่มมาข้างหน้า */
interface CategoryChip {
  category_id: number | null;
  name: string;
}

export default function HomeScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();

  // ตัวกรองเก็บไว้ใน Context เพราะหน้า FilterScreen เป็นคนแก้ค่า (คนละหน้าจอกัน)
  const { filters, setFilters, activeCount } = useFilter();

  // ตัวเลขจุดแดงบนกระดิ่ง อยู่ใน Context เพราะแท็บล่างก็ใช้ก้อนเดียวกัน
  const { unreadNotifications, refresh: refreshBadges } = useBadges();

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [position, setPosition] = useState<Coordinates | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /**
   * ดึงโพสต์
   *
   * ค่าตัวกรองที่เป็น null แปลว่า "ไม่กรอง" จึงไม่ต้องส่งไปใน query เลย
   * (feedService ตัด undefined ออกให้อีกชั้นอยู่แล้ว แต่ไม่ส่งตั้งแต่แรกอ่านง่ายกว่า)
   */
  const loadPosts = useCallback(
    async (
      pageNumber = 1,
      categoryId: number | null = filters.categoryId,
      coords: Coordinates | null = position
    ): Promise<void> => {
      try {
        setError(null);
        const res = await feedService.getFeed({
          page: pageNumber,
          limit: PAGE_SIZE,
          sort: filters.sort,
          ...(categoryId !== null ? { categoryId } : {}),
          ...(filters.maxPrice !== null ? { maxPrice: filters.maxPrice } : {}),
          /*
           * ส่งพิกัดไปเสมอถ้ารู้ตำแหน่ง เพื่อให้ backend คำนวณระยะทาง
           * มาแสดงบนการ์ดได้ ("ห่าง 1.2 กม.")
           *
           * *** ส่ง radius ต่อเมื่อผู้ใช้เปิด "เฉพาะร้านใกล้ฉัน" เท่านั้น ***
           * backend จะกรองโพสต์ทิ้งก็ต่อเมื่อได้รับ radius
           * ถ้าไม่ส่ง = ได้โพสต์ทั้งหมด พร้อมระยะทางติดมาด้วย
           */
          ...(coords !== null ? { lat: coords.latitude, lng: coords.longitude } : {}),
          ...(coords !== null && filters.nearbyOnly ? { radius: filters.radiusKm } : {}),
        });
        const items = res.data;
        setPosts((prev) => (pageNumber === 1 ? items : [...prev, ...items]));
        setHasMore(pageNumber < res.pagination.totalPages);
        setPage(pageNumber);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [filters, position]
  );

  /** โหลดครั้งแรก */
  useEffect(() => {
    void (async () => {
      setLoading(true);
      // ขอตำแหน่ง (ถ้าไม่ได้ก็ไม่เป็นไร แค่ไม่โชว์ระยะทาง)
      const coords = await locationService.getCurrentPosition().catch(() => null);
      setPosition(coords);

      const cats = await feedService.getCategories().catch((): Category[] => []);
      setCategories(cats);

      await loadPosts(1, null, coords);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await loadPosts(1);
    setRefreshing(false);
  }

  async function handleLoadMore(): Promise<void> {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPosts(page + 1);
    setLoadingMore(false);
  }

  /**
   * โหลดใหม่ทุกครั้งที่ตัวกรองเปลี่ยน
   *
   * ข้ามรอบแรกเพราะ useEffect ก้อนบนโหลดให้แล้ว
   * ถ้าไม่ข้าม จะยิง API ซ้ำสองครั้งตอนเปิดแอป
   */
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void (async () => {
      setLoading(true);
      await loadPosts(1);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  /*
   * กลับเข้าหน้านี้เมื่อไหร่ก็นับจุดแดงใหม่
   * เคสสำคัญคือกลับมาจากหน้าแจ้งเตือน ถ้าไม่นับใหม่จุดแดงจะค้างทั้งที่อ่านไปแล้ว
   */
  useFocusEffect(
    useCallback(() => {
      void refreshBadges();
    }, [refreshBadges])
  );

  function handleSelectCategory(categoryId: number | null): void {
    // กดหมวดเดิมซ้ำ = ยกเลิกการกรองหมวดนั้น
    setFilters({ categoryId: filters.categoryId === categoryId ? null : categoryId });
  }

  const categoryChips: CategoryChip[] = [
    { category_id: null, name: 'ทั้งหมด' },
    ...categories.map((c) => ({ category_id: c.category_id, name: c.name })),
  ];

  // ---- ส่วนหัวของหน้า ----
  const header = (
    <View>
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>สวัสดี {user?.name ?? 'ผู้ใช้'}</Text>
          <Text style={styles.subGreeting}>วันนี้มีอาหารดี ๆ รออยู่</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel={
            unreadNotifications > 0
              ? `การแจ้งเตือน มี ${unreadNotifications} รายการที่ยังไม่ได้อ่าน`
              : 'การแจ้งเตือน'
          }
        >
          <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
          {/* จุดแดงบอกจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน เกิน 9 แสดงเป็น 9+ */}
          {unreadNotifications > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{badgeLabel(unreadNotifications)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* แถบค้นหา + ปุ่มตัวกรอง */}
      <View style={styles.searchRow}>
        <TouchableOpacity
          style={[styles.searchBar, { flex: 1 }]}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.searchPlaceholder}>ค้นหาอาหารหรือร้านค้า</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeCount > 0 ? styles.filterButtonActive : null]}
          onPress={() => navigation.navigate('Filter')}
          accessibilityLabel="ตัวกรอง"
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={activeCount > 0 ? theme.colors.textOnPrimary : theme.colors.textPrimary}
          />
          {/* จุดแดงบอกจำนวนตัวกรองที่ใช้อยู่ ผู้ใช้จะได้ไม่ลืมว่ากรองค้างไว้ */}
          {activeCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* แถบหมวดหมู่ */}
      {categories.length > 0 ? (
        <FlatList
          horizontal
          data={categoryChips}
          keyExtractor={(item) => String(item.category_id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const active = filters.categoryId === item.category_id;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
                onPress={() => handleSelectCategory(item.category_id)}
              >
                <Text style={[styles.categoryText, active ? styles.categoryTextActive : null]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer>
        {header}
        <LoadingView message="กำลังโหลดอาหาร..." />
      </ScreenContainer>
    );
  }

  if (error !== null && posts.length === 0) {
    return (
      <ScreenContainer scroll>
        {header}
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorTitle}>โหลดข้อมูลไม่สำเร็จ</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <AppButton
            title="ลองอีกครั้ง"
            variant="outline"
            fullWidth={false}
            onPress={() => {
              setLoading(true);
              void loadPosts(1).finally(() => setLoading(false));
            }}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.post_id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void handleRefresh(); }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={() => { void handleLoadMore(); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <FoodPostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.post_id })}
            onReserve={() => navigation.navigate('ReservationConfirm', { post: item })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="ยังไม่มีอาหารในตอนนี้"
            message="ลองเปลี่ยนหมวดหมู่ หรือกลับมาดูใหม่ช่วงเย็น ซึ่งเป็นเวลาที่ร้านลงขายเยอะที่สุด"
            actionLabel="รีเฟรช"
            onAction={() => { void handleRefresh(); }}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.md }} />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl },

  greetingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md },
  greeting: { ...theme.textStyles.title, fontSize: 22 },
  subGreeting: { ...theme.textStyles.bodyMuted },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.card,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.sizes.inputHeight,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchPlaceholder: { ...theme.textStyles.bodyMuted, marginLeft: theme.spacing.sm },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  filterButton: {
    width: theme.sizes.inputHeight,
    height: theme.sizes.inputHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    /* ขอบสีพื้นหลังทำให้จุดแดงไม่ติดกับไอคอนจนดูเลอะเมื่อเลขยาว */
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  notificationBadgeText: {
    color: theme.colors.textOnPrimary,
    fontSize: 10,
    fontFamily: theme.fonts.bold,
  },

  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: theme.colors.textOnPrimary,
    fontSize: 11,
    fontFamily: theme.fonts.bold,
  },

  categoryList: { paddingVertical: theme.spacing.md },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  categoryText: { ...theme.textStyles.bodyMuted, color: theme.colors.textSecondary },
  categoryTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },

  errorWrap: { alignItems: 'center', paddingVertical: theme.spacing.xxl },
  errorTitle: { ...theme.textStyles.heading, marginTop: theme.spacing.md },
  errorMessage: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
});
