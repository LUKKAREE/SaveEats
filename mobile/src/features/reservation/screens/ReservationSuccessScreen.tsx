/**
 * จองสำเร็จ - แสดง QR Code และรหัส 4 หลัก
 *
 * *** QR ที่เห็นในหน้านี้ วาดจาก reservation.qr_payload ที่ Backend ส่งมา ***
 * แอปไม่ได้สร้างเองและไม่ได้ตรวจเอง (กฎเหล็กข้อ 4)
 * ตอนร้านสแกน จะอ่านข้อความนี้แล้วส่งกลับไปให้ Backend ตรวจอีกที
 */
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import ScreenContainer from '../../../components/ScreenContainer';
import AppButton from '../../../components/AppButton';
import useCountdown from '../../../core/hooks/useCountdown';
import { formatPrice, formatPickupRange } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'ReservationSuccess'>;

export default function ReservationSuccessScreen({ route, navigation }: Props): JSX.Element {
  const { reservation } = route.params;

  /*
   * นับถอยหลังจาก expires_at ที่ Backend คำนวณมาให้แล้ว
   * (= เวลาที่ร้านตั้งไว้ตอนโพสต์ เช่น 15 นาที)
   *
   * *** นับสดทุกวินาที ไม่ใช่คำนวณครั้งเดียวตอนเปิดหน้า ***
   * ลูกค้ามักเปิดหน้านี้ค้างไว้ระหว่างเดินไปที่ร้าน
   * ถ้าเลขไม่เดิน เขาจะไม่รู้เลยว่าเหลือเวลาจริง ๆ เท่าไหร่
   */
  const timer = useCountdown(reservation.expires_at);

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---- หัวเรื่องสำเร็จ ---- */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={theme.colors.textOnPrimary} />
          </View>
          <Text style={styles.successTitle}>จองสำเร็จแล้ว</Text>
          <Text style={styles.successSubtitle}>
            เอาหน้าจอนี้ให้ร้านสแกนตอนไปรับอาหาร
          </Text>
        </View>

        {/* ---- นับถอยหลังแบบเรียลไทม์ ---- */}
        <View style={[styles.timerCard, timer.isUrgent || timer.isExpired ? styles.timerCardUrgent : null]}>
          <View style={styles.timerHeadRow}>
            <Ionicons
              name={timer.isExpired ? 'close-circle-outline' : 'time-outline'}
              size={16}
              color={timer.isUrgent || timer.isExpired ? theme.colors.error : theme.colors.primaryDark}
            />
            <Text style={[styles.timerLabel, timer.isUrgent || timer.isExpired ? styles.urgentText : null]}>
              {timer.isExpired ? 'คิวหมดเวลาแล้ว' : 'ต้องไปรับภายใน'}
            </Text>
          </View>

          {timer.isExpired ? (
            <Text style={styles.timerExpired}>การจองนี้หมดอายุแล้ว</Text>
          ) : (
            <>
              <Text style={[styles.timerDigits, timer.isUrgent ? styles.urgentText : null]}>
                {timer.text}
              </Text>
              <Text style={[styles.timerHint, timer.isUrgent ? styles.urgentText : null]}>
                {timer.isUrgent
                  ? 'เหลือเวลาไม่ถึง 5 นาทีแล้ว รีบไปที่ร้านเลย'
                  : 'ถ้าไม่ไปรับภายในเวลานี้ คิวจะถูกยกเลิกอัตโนมัติ'}
              </Text>
            </>
          )}
        </View>

        {/* ---- QR Code ---- */}
        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            <QRCode
              value={reservation.qr_payload}
              size={200}
              color={theme.colors.textPrimary}
              backgroundColor={theme.colors.surface}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>หรือบอกรหัสนี้กับร้าน</Text>
            <View style={styles.line} />
          </View>

          {/* ---- รหัส 4 หลัก แยกเป็นช่อง อ่านง่าย ---- */}
          <View style={styles.codeRow}>
            {reservation.reservation_code.split('').map((digit, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <View key={`${digit}-${index}`} style={styles.codeBox}>
                <Text style={styles.codeDigit}>{digit}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.codeHint}>ใช้เมื่อกล้องของร้านสแกนไม่ได้</Text>
        </View>

        {/* ---- รายละเอียดการจอง ---- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>รายละเอียดการจอง</Text>

          <DetailRow label="อาหาร" value={`${reservation.food_name} x ${reservation.quantity}`} />
          <DetailRow label="ร้าน" value={reservation.store_name} />
          <DetailRow label="ยอดที่ต้องจ่าย" value={formatPrice(reservation.total_price)} highlight />
          <DetailRow
            label="ช่วงเวลารับ"
            value={formatPickupRange(reservation.pickup_start, reservation.pickup_end)}
          />
          <DetailRow label="รหัสการจอง" value={`#${reservation.reservation_id}`} />

          {reservation.store_address !== null ? (
            <DetailRow label="ที่อยู่ร้าน" value={reservation.store_address} />
          ) : null}
          {reservation.store_phone !== null ? (
            <DetailRow label="เบอร์ร้าน" value={reservation.store_phone} />
          ) : null}
        </View>

        {/* ---- คำเตือน ---- */}
        <View style={styles.noticeBox}>
          <Ionicons name="cash-outline" size={20} color={theme.colors.warningText} />
          <Text style={styles.noticeText}>
            ชำระเงินสดที่ร้าน {formatPrice(reservation.total_price)}
            {'\n'}ถ้าไม่ไปรับตามเวลา การจองจะหมดอายุอัตโนมัติ
          </Text>
        </View>

        <AppButton
          title="ดูการจองของฉัน"
          onPress={() => navigation.replace('CustomerTabs', { screen: 'ReservationHistory' })}
        />
        <AppButton
          title="กลับไปหน้าแรก"
          variant="ghost"
          onPress={() => navigation.replace('CustomerTabs')}
          style={{ marginTop: theme.spacing.sm }}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}

function DetailRow({ label, value, highlight = false, accent = false }: DetailRowProps): JSX.Element {
  const color = highlight
    ? theme.colors.primaryDark
    : accent
      ? theme.colors.accent
      : theme.colors.textPrimary;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  successHeader: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  checkCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  successTitle: { ...theme.textStyles.title, color: theme.colors.primaryDark },
  successSubtitle: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xxs,
  },

  /* ---- กล่องนับถอยหลัง ---- */
  timerCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  timerCardUrgent: {
    backgroundColor: theme.colors.errorBg,
    borderColor: theme.colors.error,
  },
  timerHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.medium,
  },
  timerDigits: {
    ...theme.textStyles.title,
    fontSize: 44,
    lineHeight: 54,
    color: theme.colors.primaryDark,
    // เลขความกว้างเท่ากัน ตัวเลขจะได้ไม่ขยับซ้ายขวาตอนนับถอยหลัง
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    textAlign: 'center',
  },
  timerExpired: {
    ...theme.textStyles.subheading,
    color: theme.colors.error,
    marginTop: theme.spacing.xxs,
  },
  urgentText: { color: theme.colors.error },

  qrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  qrBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginVertical: theme.spacing.md,
  },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { ...theme.textStyles.caption, marginHorizontal: theme.spacing.sm },

  codeRow: { flexDirection: 'row' },
  codeBox: {
    width: 52, height: 62,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  codeDigit: {
    ...theme.textStyles.title,
    fontSize: 30,
    color: theme.colors.primaryDark,
  },
  codeHint: { ...theme.textStyles.caption, marginTop: theme.spacing.sm },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionTitle: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },
  detailRow: { flexDirection: 'row', paddingVertical: 5 },
  detailLabel: { ...theme.textStyles.bodyMuted, width: 120 },
  detailValue: { ...theme.textStyles.body, flex: 1, fontFamily: theme.fonts.medium },

  noticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  noticeText: {
    ...theme.textStyles.caption,
    color: theme.colors.warningText,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
});
