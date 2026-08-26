/**
 * เขียนรีวิว (ใช้ได้จริงแล้ว)
 *
 * เข้ามาจากหน้ารายละเอียดการจอง หลังรับอาหารเรียบร้อยแล้ว
 *
 * *** Backend เป็นคนตัดสินว่ารีวิวได้หรือไม่ ***
 * เงื่อนไข : เป็นการจองของเราเอง / สถานะ completed / ยังไม่เคยรีวิว
 * หน้านี้แค่ส่งไป ถ้าไม่ผ่านก็แสดงข้อความที่ Backend ตอบกลับมา
 *
 * หลัก UX
 *   - ดาวต้องใหญ่พอให้กดง่าย และมีคำบรรยายกำกับ (5 ดาว = "ดีมาก")
 *   - ความคิดเห็นไม่บังคับ ให้แค่ดาวก็ส่งได้ ลดแรงเสียดทาน
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../../../components/ScreenContainer';
import AppButton from '../../../components/AppButton';
import FormSection from '../../../components/FormSection';

import reviewService from '../reviewService';
import { errorMessage } from '../../../core/services/apiClient';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'WriteReview'>;

/** คำบรรยายของแต่ละดาว ช่วยให้ผู้ใช้มั่นใจว่าเลือกถูก */
const RATING_LABEL: Record<number, string> = {
  1: 'แย่มาก',
  2: 'ไม่ค่อยดี',
  3: 'พอใช้',
  4: 'ดี',
  5: 'ดีมาก',
};

/** จำนวนตัวอักษรสูงสุดของความคิดเห็น */
const MAX_COMMENT = 300;

export default function WriteReviewScreen({ route, navigation }: Props): JSX.Element {
  const { reservationId, storeName } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    if (rating === 0) {
      setError('กรุณาให้คะแนนก่อนส่งรีวิว');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await reviewService.create({
        reservationId,
        rating,
        ...(comment.trim() !== '' ? { comment: comment.trim() } : {}),
      });

      Alert.alert('ขอบคุณสำหรับรีวิว', 'รีวิวของคุณช่วยให้คนอื่นตัดสินใจได้ง่ายขึ้น', [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.storeName}>{storeName}</Text>
        <Text style={styles.question}>อาหารและบริการเป็นอย่างไรบ้าง</Text>

        {/* ---- ดาว ---- */}
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => {
                setRating(n);
                setError(null);
              }}
              activeOpacity={0.7}
              accessibilityLabel={`ให้ ${n} ดาว`}
              style={styles.starButton}
            >
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={42}
                color={n <= rating ? theme.colors.accent : theme.colors.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'แตะดาวเพื่อให้คะแนน' : RATING_LABEL[rating]}
        </Text>

        {/* ---- ความคิดเห็น ---- */}
        <FormSection title="ความคิดเห็น" hint="ไม่บังคับ ให้แค่ดาวก็ส่งได้">
          <TextInput
            style={styles.textArea}
            placeholder="เล่าให้คนอื่นฟังหน่อย เช่น อาหารยังร้อนไหม ร้านหาง่ายหรือเปล่า"
            placeholderTextColor={theme.colors.textMuted}
            value={comment}
            onChangeText={(text) => setComment(text.slice(0, MAX_COMMENT))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {comment.length} / {MAX_COMMENT}
          </Text>
        </FormSection>

        {error !== null ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.noticeText}>
            รีวิวได้ครั้งเดียวต่อ 1 การจอง และแก้ไขทีหลังไม่ได้
          </Text>
        </View>

        <AppButton
          title="ส่งรีวิว"
          loading={saving}
          disabled={rating === 0}
          onPress={() => { void handleSubmit(); }}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  storeName: { ...theme.textStyles.title, fontSize: 20, textAlign: 'center' },
  question: { ...theme.textStyles.bodyMuted, textAlign: 'center', marginTop: 4 },

  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  starButton: { padding: 4 },
  ratingLabel: {
    ...theme.textStyles.subheading,
    textAlign: 'center',
    color: theme.colors.primaryDark,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },

  textArea: {
    ...theme.textStyles.body,
    minHeight: 110,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  counter: { ...theme.textStyles.caption, textAlign: 'right', marginTop: 4 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: { ...theme.textStyles.caption, color: theme.colors.error, flex: 1 },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  noticeText: { ...theme.textStyles.caption, flex: 1 },
});
