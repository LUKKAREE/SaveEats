/**
 * รายละเอียดร้าน (ใช้ได้จริงแล้ว)
 *
 * ลูกค้าเข้ามาที่นี่จาก 2 ทาง
 *   1. กดชื่อร้านในหน้ารายละเอียดอาหาร
 *   2. กดร้านจากหน้าแผนที่
 *
 * แสดง 3 ส่วน : ข้อมูลร้าน / อาหารที่กำลังขาย / รีวิว
 *
 * API : GET /api/stores/:id           (ข้อมูลร้าน + โพสต์ที่ active)
 *       GET /api/stores/:id/reviews   (รีวิว + สรุปจำนวนดาว)
 *
 * *** ที่อยู่ร้านแตะเพื่อเปิดแผนที่ได้ ***
 * เดิมหน้านี้แสดงที่อยู่เป็นข้อความเฉย ๆ ทั้งที่หน้า StoreLocation มีอยู่แล้ว
 * แต่ไม่มีปุ่มไหนในแอปพาไปหน้านั้นจากที่นี่เลย ผู้ใช้จึงดูตำแหน่งร้านไม่ได้
 * แก้เมื่อ 16 ก.ย. 2569 หลังพบระหว่างการทดสอบการยอมรับของผู้ใช้
 */
import { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Linking, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { StoreDetailPayload } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';
import FoodPostCard from '../../feed/components/FoodPostCard';
import RatingSummary from '../components/RatingSummary';
import ReviewItem from '../components/ReviewItem';

import storeService from '../storeService';
import reviewService from '../../review/reviewService';
import type { StoreReviews } from '../../review/reviewService';
import { errorMessage } from '../../../core/services/apiClient';
import favoriteService from '../../favorite/favoriteService';
import { imageUrl } from '../../../core/constants/apiConstants';
import { formatRating } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'StoreDetail'>;

export default function StoreDetailScreen({ route, navigation }: Props): JSX.Element {
  const { storeId } = route.params;

  const [data, setData] = useState<StoreDetailPayload | null>(null);
  const [reviews, setReviews] = useState<StoreReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** ร้านนี้อยู่ในรายการโปรดหรือยัง */
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      // เช็คหัวใจแยกต่างหาก ล้มเหลวก็แค่ขึ้นหัวใจโปร่ง ไม่ทำให้ทั้งหน้าพัง
      void favoriteService.listIds()
        .then((ids) => { setIsFavorite(ids.includes(storeId)); })
        .catch(() => { setIsFavorite(false); });

      // ยิงพร้อมกันทั้งสองเส้น เร็วกว่ารอทีละอัน
      // รีวิวโหลดไม่ได้ก็ไม่เป็นไร ยังดูข้อมูลร้านได้ จึงใช้ catch แยก
      const [detail, rv] = await Promise.all([
        storeService.getDetail(storeId),
        reviewService.listByStore(storeId).catch((): StoreReviews | null => null),
      ]);
      setData(detail);
      setReviews(rv);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [storeId]);

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

  if (loading) return <LoadingView message="กำลังโหลดข้อมูลร้าน..." />;

  if (data === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="storefront-outline"
          title="เปิดร้านนี้ไม่ได้"
          message={error ?? 'ร้านนี้อาจถูกปิดหรือยังไม่ได้รับอนุมัติ'}
          actionLabel="ลองใหม่"
          onAction={() => { void load(); }}
        />
      </ScreenContainer>
    );
  }

  const { store, posts } = data;
  const cover = imageUrl(store.image, 'store');

  /** ร้านปักหมุดไว้แล้วหรือยัง ถ้ายังก็ไม่ควรมีปุ่มเปิดแผนที่ให้กด */
  const hasLocation = store.latitude !== null && store.longitude !== null;

  /**
   * กด/เลิกกดหัวใจ
   *
   * เปลี่ยนไอคอนก่อนเลยไม่ต้องรอ server เพราะผู้ใช้คาดหวังว่ากดแล้วต้องติดทันที
   * ถ้าพลาดค่อยเปลี่ยนกลับ
   */
  async function toggleFavorite(): Promise<void> {
    const next = !isFavorite;
    setIsFavorite(next);
    setTogglingFavorite(true);
    try {
      await favoriteService.toggle(storeId, isFavorite);
    } catch (err) {
      setIsFavorite(!next);
      Alert.alert('บันทึกร้านโปรดไม่สำเร็จ', errorMessage(err));
    } finally {
      setTogglingFavorite(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---- รูปหน้าร้าน + ปุ่มหัวใจ ---- */}
        <View style={styles.coverWrap}>
          {cover !== null ? (
            <Image source={{ uri: cover }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverEmpty]}>
              <Ionicons name="storefront-outline" size={40} color={theme.colors.textMuted} />
            </View>
          )}

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => { void toggleFavorite(); }}
            disabled={togglingFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? theme.colors.error : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* ---- ข้อมูลร้าน ---- */}
        <View style={styles.card}>
          <Text style={styles.storeName}>{store.store_name}</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={theme.colors.accent} />
            <Text style={styles.ratingText}>
              {Number(store.rating) > 0
                ? formatRating(store.rating, store.review_count)
                : 'ยังไม่มีรีวิว'}
            </Text>
          </View>

          {store.description !== null ? (
            <Text style={styles.description}>{store.description}</Text>
          ) : null}

          {store.open_time !== null && store.close_time !== null ? (
            <InfoRow
              icon="time-outline"
              text={`เปิด ${store.open_time.slice(0, 5)} - ${store.close_time.slice(0, 5)} น.`}
            />
          ) : null}

          {/*
            ที่อยู่ร้าน — แตะแล้วเปิดแผนที่เต็มจอ

            *** ทำไมต้องเช็คพิกัดก่อนถึงจะให้กดได้ ***
            หน้า StoreLocation ต้องใช้ latitude กับ longitude เป็นตัวเลขเสมอ
            ร้านที่ยังไม่ได้ปักหมุดจะมีค่าเป็น null การให้กดได้ทั้งที่ไม่มีพิกัด
            จะพาไปหน้าแผนที่เปล่า ๆ ซึ่งแย่กว่าการไม่มีปุ่มให้กดตั้งแต่แรก
            กรณีนั้นจึงแสดงที่อยู่เป็นข้อความเฉย ๆ เหมือนเดิม

            ใช้ Number() ครอบไว้เพราะคอลัมน์เป็น DECIMAL ตัวเชื่อมต่อฐานข้อมูล
            อาจคืนค่ามาเป็นข้อความ หน้าแผนที่รับเฉพาะตัวเลขเท่านั้น
          */}
          {hasLocation ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('StoreLocation', {
                  storeName: store.store_name,
                  address: store.address,
                  latitude: Number(store.latitude),
                  longitude: Number(store.longitude),
                })
              }
              activeOpacity={0.7}
            >
              <InfoRow
                icon="location-outline"
                text={store.address ?? 'ดูตำแหน่งร้านบนแผนที่'}
                link
                trailing="map-outline"
              />
            </TouchableOpacity>
          ) : store.address !== null ? (
            <InfoRow icon="location-outline" text={store.address} />
          ) : null}

          {/* กดเบอร์แล้วโทรออกได้เลย ลดขั้นตอนให้ผู้ใช้ */}
          {store.phone !== null ? (
            <TouchableOpacity
              onPress={() => { void Linking.openURL(`tel:${store.phone ?? ''}`); }}
              activeOpacity={0.7}
            >
              <InfoRow icon="call-outline" text={store.phone} link />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ---- อาหารที่กำลังขาย ---- */}
        <Text style={styles.sectionTitle}>กำลังขายอยู่ ({posts.length})</Text>

        {posts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              ตอนนี้ร้านนี้ยังไม่มีอาหารลงขาย ลองกลับมาดูใหม่ช่วงเย็น
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <FoodPostCard
              key={post.post_id}
              post={post}
              onPress={() => navigation.navigate('PostDetail', { postId: post.post_id })}
              onReserve={() => navigation.navigate('ReservationConfirm', { post })}
            />
          ))
        )}

        {/* ---- รีวิว ---- */}
        <Text style={styles.sectionTitle}>
          รีวิวจากลูกค้า{reviews !== null ? ` (${reviews.total})` : ''}
        </Text>

        {reviews === null ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>โหลดรีวิวไม่สำเร็จ ลองดึงหน้าจอลงเพื่อรีเฟรช</Text>
          </View>
        ) : reviews.total === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              ยังไม่มีใครรีวิวร้านนี้ ถ้าคุณเคยมารับอาหารแล้ว ลองเป็นคนแรกที่เขียนรีวิวดู
            </Text>
          </View>
        ) : (
          <>
            <RatingSummary
              average={Number(store.rating)}
              total={reviews.total}
              breakdown={reviews.breakdown}
            />
            {reviews.items.map((review) => (
              <ReviewItem key={review.review_id} review={review} />
            ))}
          </>
        )}

        {/* ---- แจ้งปัญหา ----
            วางไว้ล่างสุดโดยตั้งใจ เพราะเป็นทางเลือกสุดท้าย
            ไม่ควรเด่นกว่าปุ่มจอง แต่ก็ต้องหาเจอเมื่อผู้ใช้ต้องการจริง ๆ */}
        <TouchableOpacity
          style={styles.reportButton}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('Report', {
              targetType: 'store',
              targetId: store.store_id,
              targetName: store.store_name,
            })
          }
        >
          <Ionicons name="flag-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.reportText}>แจ้งปัญหาเกี่ยวกับร้านนี้</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * แถวข้อมูล 1 บรรทัด มีไอคอนนำหน้า
 *
 * trailing คือไอคอนท้ายแถว ใส่เมื่อแถวนั้นกดได้และพาไปหน้าอื่น
 * ตัวอักษรสีเขียวอย่างเดียวยังบอกไม่ชัดว่าแตะได้ เพราะในหน้านี้มีข้อความสีเขียว
 * ที่ไม่ได้กดได้อยู่ด้วย ไอคอนท้ายแถวจึงทำหน้าที่บอกว่า "แตะแล้วไปต่อ"
 */
function InfoRow({
  icon,
  text,
  link = false,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  link?: boolean;
  trailing?: keyof typeof Ionicons.glyphMap;
}): JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={16}
        color={link ? theme.colors.primary : theme.colors.textMuted}
      />
      <Text style={[styles.infoText, link ? styles.infoLink : null]}>{text}</Text>
      {trailing !== undefined ? (
        <Ionicons name={trailing} size={16} color={theme.colors.primary} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },

  coverWrap: { position: 'relative' },
  cover: { width: '100%', height: 180, backgroundColor: theme.colors.surfaceAlt },
  favoriteButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    marginBottom: 0,
    ...theme.shadows.card,
  },
  storeName: { ...theme.textStyles.title, fontSize: 21 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  ratingText: { ...theme.textStyles.caption },
  description: { ...theme.textStyles.body, marginTop: theme.spacing.sm },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  infoText: { ...theme.textStyles.caption, flex: 1 },
  infoLink: { color: theme.colors.primary, fontFamily: theme.fonts.medium },

  sectionTitle: {
    ...theme.textStyles.subheading,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
  },
  emptyText: { ...theme.textStyles.caption },

  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  reportText: { ...theme.textStyles.caption },
});
