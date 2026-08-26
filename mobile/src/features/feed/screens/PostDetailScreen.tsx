/**
 * รายละเอียดอาหาร 1 รายการ ก่อนกดจอง
 */
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeedItem } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';
import AppButton from '../../../components/AppButton';
import StickyFooter from '../../../components/StickyFooter';

import feedService from '../feedService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import {
  formatPrice, formatDiscount, formatPickupRange, formatTimeLeft, formatDistance,
} from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'PostDetail'>;

export default function PostDetailScreen({ route, navigation }: Props): JSX.Element {
  const { postId } = route.params;

  const [post, setPost] = useState<FeedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await feedService.getPost(postId);
        if (active) setPost(data);
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [postId]);

  if (loading) {
    return <ScreenContainer><LoadingView /></ScreenContainer>;
  }

  if (error !== null || post === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="cloud-offline-outline"
          title="โหลดข้อมูลไม่สำเร็จ"
          message={error ?? 'ไม่พบรายการอาหารนี้'}
          actionLabel="ย้อนกลับ"
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const uri = imageUrl(post.image, 'food');
  const discount = formatDiscount(post.normal_price, post.discount_price);
  const soldOut = post.quantity_left <= 0;
  const expired = new Date(post.pickup_end.replace(' ', 'T')).getTime() <= Date.now();
  const canReserve = !soldOut && !expired && post.status === 'active';

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---- รูปใหญ่ ---- */}
        <View style={styles.imageWrap}>
          {uri !== null ? (
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imageEmpty]}>
              <Ionicons name="fast-food-outline" size={56} color={theme.colors.textMuted} />
            </View>
          )}
          {discount !== null ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {/* ---- ชื่อและราคา ---- */}
          <Text style={styles.foodName}>{post.food_name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceStrike}>{formatPrice(post.normal_price)}</Text>
            <Text style={styles.price}>{formatPrice(post.discount_price)}</Text>
          </View>

          {post.food_description !== null && post.food_description !== '' ? (
            <Text style={styles.description}>{post.food_description}</Text>
          ) : null}

          {post.caption !== null && post.caption !== '' ? (
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{post.caption}</Text>
            </View>
          ) : null}

          {/* ---- ข้อมูลสำคัญ ---- */}
          <View style={styles.infoCard}>
            <InfoRow
              icon="cube-outline"
              label="จำนวนคงเหลือ"
              value={soldOut ? 'ขายหมดแล้ว' : `${post.quantity_left} ชุด`}
              danger={post.quantity_left <= 3}
            />
            <InfoRow
              icon="time-outline"
              label="ช่วงเวลารับ"
              value={formatPickupRange(post.pickup_start, post.pickup_end)}
            />
            <InfoRow
              icon="hourglass-outline"
              label="เหลือเวลา"
              value={formatTimeLeft(post.pickup_end)}
              accent
            />
          </View>

          {/* ---- ข้อมูลร้าน ---- */}
          <View style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <View style={styles.storeIcon}>
                <Ionicons name="storefront" size={20} color={theme.colors.textOnPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{post.store_name}</Text>
                <View style={styles.storeMeta}>
                  {Number(post.store_rating) > 0 ? (
                    <>
                      <Ionicons name="star" size={12} color={theme.colors.star} />
                      <Text style={styles.storeMetaText}>
                        {Number(post.store_rating).toFixed(1)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.storeMetaText}>ยังไม่มีรีวิว</Text>
                  )}
                  {post.distance_km !== null && post.distance_km !== undefined ? (
                    <Text style={styles.storeMetaText}>
                      {'  '}{formatDistance(post.distance_km)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {post.store_address !== null ? (
              <Text style={styles.address}>{post.store_address}</Text>
            ) : null}

            <AppButton
              title="ดูร้านนี้"
              variant="outline"
              onPress={() => navigation.navigate('StoreDetail', { storeId: post.store_id })}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>

          {/* ---- แจ้งเตือนเรื่องการชำระเงิน ---- */}
          <View style={styles.noticeBox}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.warningText} />
            <Text style={styles.noticeText}>
              ชำระเงินสดที่ร้านตอนไปรับเท่านั้น ไม่มีการจ่ายเงินผ่านแอป
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ---- ปุ่มจองติดขอบล่าง ----
          StickyFooter เผื่อความสูงแถบปุ่มของระบบให้เอง ปุ่มจะได้ไม่ไปทับปุ่มโฮม */}
      <StickyFooter>
        <AppButton
          title={soldOut ? 'ขายหมดแล้ว' : expired ? 'หมดเวลารับแล้ว' : 'จองอาหาร'}
          onPress={() => navigation.navigate('ReservationConfirm', { post })}
          disabled={!canReserve}
        />
      </StickyFooter>
    </ScreenContainer>
  );
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  danger?: boolean;
  accent?: boolean;
}

function InfoRow({ icon, label, value, danger = false, accent = false }: InfoRowProps): JSX.Element {
  const color = danger ? theme.colors.error : accent ? theme.colors.accent : theme.colors.textPrimary;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xl },

  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 240, backgroundColor: theme.colors.surfaceAlt },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  discountBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  discountText: {
    ...theme.textStyles.button,
    fontSize: 14,
    color: theme.colors.textOnPrimary,
  },

  body: { padding: theme.spacing.md },
  foodName: { ...theme.textStyles.title },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: theme.spacing.xs },
  priceStrike: { ...theme.textStyles.priceStrike, marginRight: theme.spacing.sm },
  price: { ...theme.textStyles.price, fontSize: 26 },
  description: { ...theme.textStyles.body, marginTop: theme.spacing.sm },

  captionBox: {
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  captionText: { ...theme.textStyles.bodyMuted, color: theme.colors.primaryDark },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    ...theme.shadows.card,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoLabel: { ...theme.textStyles.bodyMuted, flex: 1, marginLeft: theme.spacing.sm },
  infoValue: { ...theme.textStyles.body, fontFamily: theme.fonts.medium },

  storeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    ...theme.shadows.card,
  },
  storeHeader: { flexDirection: 'row', alignItems: 'center' },
  storeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  storeName: { ...theme.textStyles.subheading },
  storeMeta: { flexDirection: 'row', alignItems: 'center' },
  storeMetaText: { ...theme.textStyles.caption, marginLeft: 2 },
  address: { ...theme.textStyles.caption, marginTop: theme.spacing.sm },

  noticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  noticeText: {
    ...theme.textStyles.caption,
    color: theme.colors.warningText,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

});
