/**
 * สรุปคะแนนรีวิว : คะแนนเฉลี่ยตัวใหญ่ + แถบจำนวนรีวิวแยกตามดาว
 *
 * หลัก UX : ตัวเลข 4.5 บอกได้แค่ "ดี" แต่แถบด้านข้างบอกได้ว่า
 * ดีเพราะทุกคนให้ 4-5 ดาว หรือดีเพราะมีคนให้ 5 เยอะจนกลบคนที่ให้ 1
 * ผู้ใช้จะตัดสินใจได้แม่นกว่า
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RatingBreakdown } from '@shared/index';
import { theme } from '../../../core/theme/theme';

interface RatingSummaryProps {
  average: number;
  total: number;
  breakdown: RatingBreakdown;
}

/** เรียงจาก 5 ดาวลงมา 1 ดาว (คนอ่านจากบนลงล่าง อยากเห็นดาวเยอะก่อน) */
const STARS = [5, 4, 3, 2, 1] as const;

export default function RatingSummary({
  average,
  total,
  breakdown,
}: RatingSummaryProps): JSX.Element {
  return (
    <View style={styles.card}>
      {/* ---- คะแนนเฉลี่ย ---- */}
      <View style={styles.left}>
        <Text style={styles.average}>{average.toFixed(1)}</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= Math.round(average) ? 'star' : 'star-outline'}
              size={13}
              color={theme.colors.accent}
            />
          ))}
        </View>
        <Text style={styles.totalText}>{total} รีวิว</Text>
      </View>

      {/* ---- แถบแยกตามดาว ---- */}
      <View style={styles.right}>
        {STARS.map((star) => {
          const count = breakdown[star];
          // total เป็น 0 ไม่ได้ในทางปฏิบัติ (คอมโพเนนต์นี้ถูกเรียกเมื่อมีรีวิวแล้ว)
          // แต่กันไว้ก่อน ไม่งั้นจะหารด้วยศูนย์แล้วได้ NaN
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <View key={star} style={styles.barRow}>
              <Text style={styles.barLabel}>{star}</Text>
              <Ionicons name="star" size={11} color={theme.colors.accent} />
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },

  left: { alignItems: 'center', justifyContent: 'center', minWidth: 76 },
  average: { fontSize: 34, fontFamily: theme.fonts.bold, color: theme.colors.textPrimary },
  starRow: { flexDirection: 'row', gap: 1 },
  totalText: { ...theme.textStyles.caption, marginTop: 2 },

  right: { flex: 1, justifyContent: 'center', gap: 3 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLabel: { ...theme.textStyles.caption, width: 10, textAlign: 'right' },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: theme.colors.accent },
  barCount: { ...theme.textStyles.caption, width: 22, textAlign: 'right' },
});
