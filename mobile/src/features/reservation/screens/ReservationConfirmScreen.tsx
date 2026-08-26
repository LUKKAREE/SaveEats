/**
 * ยืนยันการจอง
 *
 * *** จุดสำคัญด้าน UX : ปุ่มยืนยันต้องกดซ้ำไม่ได้ ***
 * ถ้ากดซ้ำได้ ลูกค้าจะจอง 2 รอบโดยไม่ตั้งใจ แล้วของหมดโดยเปล่าประโยชน์
 * AppButton จัดการให้แล้วผ่าน prop loading
 */
import { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../../../components/ScreenContainer';
import AppButton from '../../../components/AppButton';
import StickyFooter from '../../../components/StickyFooter';
import StoreMapCard from '../../../components/StoreMapCard';
import reservationService from '../reservationService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { formatPrice, formatPickupRange } from '../../../core/utils/formatters';
import { MAX_RESERVATION_QUANTITY } from '../../../core/constants/appConstants';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'ReservationConfirm'>;

export default function ReservationConfirmScreen({ route, navigation }: Props): JSX.Element {
  const { post } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** จองได้มากสุดเท่าไหร่ = น้อยกว่าระหว่าง ของที่เหลือ กับ โควตาต่อคน */
  const maxQuantity = Math.min(post.quantity_left, MAX_RESERVATION_QUANTITY);
  const total = Number(post.discount_price) * quantity;
  const saved = (Number(post.normal_price) - Number(post.discount_price)) * quantity;
  const uri = imageUrl(post.image, 'food');

  async function handleConfirm(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const reservation = await reservationService.create({ postId: post.post_id, quantity });
      // replace ไม่ใช่ navigate เพื่อไม่ให้กดย้อนกลับมาหน้ายืนยันแล้วจองซ้ำได้
      navigation.replace('ReservationSuccess', { reservation });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error !== null ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ---- สรุปรายการ ---- */}
        <View style={styles.card}>
          <View style={styles.itemRow}>
            {uri !== null ? (
              <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Ionicons name="fast-food-outline" size={26} color={theme.colors.textMuted} />
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.storeName}>{post.store_name}</Text>
              <Text style={styles.foodName}>{post.food_name}</Text>
              <Text style={styles.unitPrice}>{formatPrice(post.discount_price)} ต่อชุด</Text>
            </View>
          </View>
        </View>

        {/* ---- เลือกจำนวน ---- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>จำนวนที่ต้องการ</Text>

          <View style={styles.counterRow}>
            <TouchableOpacity
              style={[styles.counterButton, quantity <= 1 ? styles.counterDisabled : null]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              accessibilityLabel="ลดจำนวน"
            >
              <Ionicons name="remove" size={22} color={theme.colors.primary} />
            </TouchableOpacity>

            <Text style={styles.counterValue}>{quantity}</Text>

            <TouchableOpacity
              style={[styles.counterButton, quantity >= maxQuantity ? styles.counterDisabled : null]}
              onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              accessibilityLabel="เพิ่มจำนวน"
            >
              <Ionicons name="add" size={22} color={theme.colors.primary} />
            </TouchableOpacity>

            <Text style={styles.counterHint}>
              เหลือ {post.quantity_left} ชุด{'\n'}
              จองได้สูงสุด {MAX_RESERVATION_QUANTITY} ชุดต่อครั้ง
            </Text>
          </View>
        </View>

        {/* ---- สรุปราคา ---- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>สรุปราคา</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {formatPrice(post.discount_price)} x {quantity} ชุด
            </Text>
            <Text style={styles.summaryValue}>{formatPrice(total)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ประหยัดไปได้</Text>
            <Text style={styles.savedValue}>{formatPrice(saved)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ยอดที่ต้องจ่ายที่ร้าน</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* ---- ข้อมูลการรับ ---- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ไปรับที่ร้าน</Text>

          <View style={styles.pickupRow}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
            <Text style={styles.pickupText}>
              {formatPickupRange(post.pickup_start, post.pickup_end)}
            </Text>
          </View>

          {post.store_address !== null ? (
            <View style={styles.pickupRow}>
              <Ionicons name="location-outline" size={18} color={theme.colors.textMuted} />
              <Text style={styles.pickupText}>{post.store_address}</Text>
            </View>
          ) : null}
        </View>

        {/*
          ---- แผนที่ร้าน ----
          วางไว้ก่อนคำเตือน เพราะเป็นข้อมูลที่ใช้ "ตัดสินใจ" ว่าจะจองไหม
          ลูกค้าต้องไปรับเอง จึงต้องรู้ก่อนกดยืนยันว่าร้านอยู่ไกลแค่ไหน
          ไม่ใช่ไปรู้เอาตอนจองเสร็จแล้วซึ่งสายไป
        */}
        <StoreMapCard
          storeName={post.store_name}
          address={post.store_address}
          latitude={post.latitude}
          longitude={post.longitude}
          onPress={() => {
            // เช็คซ้ำให้ TypeScript มั่นใจว่าไม่ใช่ null (การ์ดซ่อนปุ่มให้แล้วถ้าไม่มีพิกัด)
            if (post.latitude === null || post.longitude === null) return;
            navigation.navigate('StoreLocation', {
              storeName: post.store_name,
              address: post.store_address,
              latitude: Number(post.latitude),
              longitude: Number(post.longitude),
            });
          }}
        />

        {/* ---- คำเตือนสำคัญ ---- */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={20} color={theme.colors.warningText} />
          <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            <Text style={styles.noticeTitle}>ก่อนกดยืนยัน</Text>
            <Text style={styles.noticeText}>
              ชำระเงินสดที่ร้านเท่านั้น ไม่มีบริการจัดส่ง{'\n'}
              ถ้าไม่ไปรับตามเวลา การจองจะหมดอายุและของจะถูกคืนเข้าระบบ
            </Text>
          </View>
        </View>
      </ScrollView>

      {/*
        StickyFooter เผื่อระยะแถบปุ่มของระบบให้เอง
        เดิมเป็น View ธรรมดาที่ paddingBottom เป็นเลขตายตัว
        ปุ่มยืนยันจึงไปนอนทับปุ่มย้อนกลับ/โฮมของเครื่อง กดพลาดง่ายมาก
      */}
      <StickyFooter>
        <AppButton
          title={`ยืนยันการจอง ${formatPrice(total)}`}
          onPress={() => { void handleConfirm(); }}
          loading={submitting}
        />
      </StickyFooter>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },

  errorBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.error,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionTitle: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },

  itemRow: { flexDirection: 'row' },
  thumb: {
    width: 72, height: 72,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginLeft: theme.spacing.md },
  storeName: { ...theme.textStyles.caption, color: theme.colors.primaryDark },
  foodName: { ...theme.textStyles.heading },
  unitPrice: { ...theme.textStyles.bodyMuted },

  counterRow: { flexDirection: 'row', alignItems: 'center' },
  counterButton: {
    width: 44, height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  counterDisabled: { borderColor: theme.colors.disabled, opacity: 0.4 },
  counterValue: {
    ...theme.textStyles.title,
    minWidth: 56,
    textAlign: 'center',
  },
  counterHint: { ...theme.textStyles.caption, flex: 1, marginLeft: theme.spacing.sm },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: { ...theme.textStyles.bodyMuted },
  summaryValue: { ...theme.textStyles.body },
  savedValue: { ...theme.textStyles.body, color: theme.colors.success },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: { ...theme.textStyles.subheading },
  totalValue: { ...theme.textStyles.price },

  pickupRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  pickupText: { ...theme.textStyles.bodyMuted, flex: 1, marginLeft: theme.spacing.sm },

  noticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  noticeTitle: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.warningText,
    fontFamily: theme.fonts.medium,
  },
  noticeText: { ...theme.textStyles.caption, color: theme.colors.warningText },
});
