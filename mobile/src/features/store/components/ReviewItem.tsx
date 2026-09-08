/**
 * รีวิว 1 รายการ
 * ใช้ทั้งในหน้ารายละเอียดร้าน (ฝั่งลูกค้า) และหน้ารีวิวของร้าน (ฝั่งร้าน)
 *
 * *** ปุ่มแจ้งรีวิวโผล่เฉพาะตอนส่ง onReport เข้ามา ***
 * ฝั่งลูกค้าที่กำลังอ่านรีวิวร้านอื่นไม่ต้องเห็นปุ่มนี้ จึงไม่ส่ง onReport มา
 * ส่วนฝั่งร้านที่เจอรีวิวไม่เป็นธรรมกับร้านตัวเอง ต้องมีทางร้องเรียนได้
 */
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Review } from '@shared/index';

import { imageUrl } from '../../../core/constants/apiConstants';
import { formatRelativeTime } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';

interface ReviewItemProps {
  review: Review;
  /** ส่งมาเมื่อผู้ที่กำลังดูมีสิทธิ์แจ้งรีวิวนี้ (ฝั่งร้าน) */
  onReport?: () => void;
}

export default function ReviewItem({ review, onReport }: ReviewItemProps): JSX.Element {
  const avatar = imageUrl(review.customer_avatar ?? null, 'profile');
  const name = review.customer_name ?? `ผู้ใช้ #${review.customer_id}`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {avatar !== null ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            {/* ไม่มีรูปก็ใช้อักษรตัวแรกของชื่อแทน ดูเป็นคนมากกว่าไอคอนคนเหมือนกันหมด */}
            <Text style={styles.avatarLetter}>{name.charAt(0)}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons
                key={n}
                name={n <= review.rating ? 'star' : 'star-outline'}
                size={12}
                color={theme.colors.accent}
              />
            ))}
            <Text style={styles.time}>{formatRelativeTime(review.created_at)}</Text>
          </View>
        </View>
      </View>

      {review.comment !== null && review.comment.trim() !== '' ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}

      {onReport !== undefined ? (
        <TouchableOpacity
          style={styles.reportButton}
          activeOpacity={0.7}
          onPress={onReport}
          // ตัวหนังสือเล็ก ขยายพื้นที่กดให้นิ้วโป้งกดโดนง่าย
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="flag-outline" size={13} color={theme.colors.textMuted} />
          <Text style={styles.reportText}>แจ้งรีวิวนี้</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceAlt },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  avatarLetter: {
    ...theme.textStyles.subheading,
    color: theme.colors.primaryDark,
    fontSize: 16,
  },
  name: { ...theme.textStyles.body, fontFamily: theme.fonts.medium },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 1 },
  time: { ...theme.textStyles.caption, marginLeft: theme.spacing.sm },
  comment: { ...theme.textStyles.body, marginTop: theme.spacing.sm },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  reportText: { ...theme.textStyles.caption, color: theme.colors.textMuted },
});
