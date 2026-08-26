/**
 * การ์ดโพสต์อาหาร 1 อัน - ส่วนประกอบที่ผู้ใช้เห็นบ่อยที่สุดในแอป
 *
 * หน้าตาตามที่ออกแบบไว้ในแผน
 *   +----------------------------+
 *   | [รูปอาหาร]        ลด 42%   |
 *   |                  เหลือ 5 ชุด|
 *   | [logo] ร้าน ABC   4.5 * 1.2กม|
 *   | ข้าวกะเพราหมูสับ            |
 *   | รับได้ 17:00 - 20:00        |
 *   | 60 บาท  35 บาท   [ จองอาหาร ]|
 *   +----------------------------+
 *
 * หลัก UX ที่ใช้
 *   - ป้าย "ลด %" อยู่มุมซ้ายบนของรูป เห็นชัดที่สุดโดยไม่ต้องอ่าน
 *   - ราคาเดิมขีดฆ่าอยู่ข้างราคาใหม่ ทำให้เห็นความคุ้มทันที
 *   - เวลาที่เหลือเปลี่ยนเป็นสีส้มเมื่อใกล้หมด สร้างความเร่งด่วนแบบไม่กดดันเกินไป
 *   - จำนวนคงเหลือน้อยกว่า 3 ชุด แสดงเป็นสีแดง
 */
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeedItem } from '@shared/index';

import { theme } from '../../../core/theme/theme';
import { imageUrl } from '../../../core/constants/apiConstants';
import {
  formatPrice, formatDiscount, formatPickupRange,
  formatTimeLeft, formatDistance, truncate,
} from '../../../core/utils/formatters';

interface FoodPostCardProps {
  post: FeedItem;
  onPress: () => void;
  onReserve: () => void;
}

/** ถ้าเหลือน้อยกว่าหรือเท่าจำนวนนี้ จะแสดงป้ายสีแดง */
const LOW_STOCK_THRESHOLD = 3;

export default function FoodPostCard({ post, onPress, onReserve }: FoodPostCardProps): JSX.Element {
  const discount = formatDiscount(post.normal_price, post.discount_price);
  const imgUri = imageUrl(post.image, 'food');
  const lowStock = post.quantity_left <= LOW_STOCK_THRESHOLD;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityLabel={`${post.food_name} จากร้าน ${post.store_name}`}
    >
      {/* ---- รูปอาหาร ---- */}
      <View style={styles.imageWrap}>
        {imgUri !== null ? (
          <Image source={{ uri: imgUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="fast-food-outline" size={40} color={theme.colors.textMuted} />
          </View>
        )}

        {discount !== null ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}</Text>
          </View>
        ) : null}

        <View style={[styles.stockBadge, lowStock ? styles.stockBadgeLow : null]}>
          <Text style={styles.stockText}>เหลือ {post.quantity_left} ชุด</Text>
        </View>
      </View>

      {/* ---- เนื้อหา ---- */}
      <View style={styles.body}>
        {/* ชื่อร้าน + คะแนน + ระยะทาง */}
        <View style={styles.storeRow}>
          <Ionicons name="storefront-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.storeName} numberOfLines={1}>{post.store_name}</Text>

          {Number(post.store_rating) > 0 ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={theme.colors.star} />
              <Text style={styles.ratingText}>{Number(post.store_rating).toFixed(1)}</Text>
            </View>
          ) : null}

          {post.distance_km !== null && post.distance_km !== undefined ? (
            <Text style={styles.distanceText}>{formatDistance(post.distance_km)}</Text>
          ) : null}
        </View>

        {/* ชื่ออาหาร */}
        <Text style={styles.foodName} numberOfLines={2}>{post.food_name}</Text>

        {/* caption */}
        {post.caption !== null && post.caption !== '' ? (
          <Text style={styles.caption} numberOfLines={1}>{truncate(post.caption, 70)}</Text>
        ) : null}

        {/* เวลารับ */}
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.timeText}>
            {formatPickupRange(post.pickup_start, post.pickup_end)}
          </Text>
          <Text style={styles.timeLeft}>{formatTimeLeft(post.pickup_end)}</Text>
        </View>

        {/* ราคา + ปุ่มจอง */}
        <View style={styles.footer}>
          <View style={styles.priceWrap}>
            <Text style={styles.priceStrike}>{formatPrice(post.normal_price)}</Text>
            <Text style={styles.price}>{formatPrice(post.discount_price)}</Text>
          </View>

          <TouchableOpacity
            style={styles.reserveButton}
            onPress={onReserve}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`จอง ${post.food_name}`}
          >
            <Text style={styles.reserveText}>จองอาหาร</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    height: theme.sizes.cardImageHeight,
    backgroundColor: theme.colors.surfaceAlt,
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

  discountBadge: {
    position: 'absolute', top: theme.spacing.sm, left: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm + 2, paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  discountText: {
    ...theme.textStyles.caption,
    color: theme.colors.textOnPrimary,
    fontFamily: theme.fonts.bold,
  },

  stockBadge: {
    position: 'absolute', top: theme.spacing.sm, right: theme.spacing.sm,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    paddingHorizontal: theme.spacing.sm, paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  stockBadgeLow: { backgroundColor: theme.colors.error },
  stockText: { ...theme.textStyles.caption, color: theme.colors.textOnPrimary },

  body: { padding: theme.spacing.md },

  storeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs },
  storeName: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.medium,
    marginLeft: 4,
    flexShrink: 1,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginLeft: theme.spacing.sm },
  ratingText: { ...theme.textStyles.caption, marginLeft: 2 },
  distanceText: { ...theme.textStyles.caption, marginLeft: 'auto' },

  foodName: { ...theme.textStyles.heading, marginBottom: 2 },
  caption: { ...theme.textStyles.caption, marginBottom: theme.spacing.xs },

  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  timeText: { ...theme.textStyles.caption, marginLeft: 4 },
  timeLeft: {
    ...theme.textStyles.caption,
    color: theme.colors.accent,
    fontFamily: theme.fonts.medium,
    marginLeft: 'auto',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline' },
  priceStrike: { ...theme.textStyles.priceStrike, marginRight: theme.spacing.sm },
  price: { ...theme.textStyles.price },

  reserveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.md,
  },
  reserveText: {
    ...theme.textStyles.button,
    fontSize: 14,
    color: theme.colors.textOnPrimary,
  },
});
