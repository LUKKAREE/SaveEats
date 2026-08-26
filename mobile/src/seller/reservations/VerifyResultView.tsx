/**
 * แสดงผลการยืนยันการรับอาหาร
 * ใช้ร่วมกันระหว่างหน้าสแกน QR และหน้ากรอกรหัส 4 หลัก
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReservationDetail } from '@shared/index';

import AppButton from '../../components/AppButton';
import { formatPrice } from '../../core/utils/formatters';
import { theme } from '../../core/theme/theme';

export interface VerifyResult {
  ok: boolean;
  message: string;
  reservation?: ReservationDetail;
}

interface VerifyResultViewProps {
  result: VerifyResult;
  onAgain: () => void;
  onClose: () => void;
}

export default function VerifyResultView({
  result,
  onAgain,
  onClose,
}: VerifyResultViewProps): JSX.Element {
  const { ok, message, reservation } = result;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.iconCircle, ok ? styles.iconOk : styles.iconFail]}>
        <Ionicons
          name={ok ? 'checkmark' : 'close'}
          size={44}
          color={theme.colors.textOnPrimary}
        />
      </View>

      <Text style={[styles.title, ok ? styles.titleOk : styles.titleFail]}>
        {ok ? 'ยืนยันสำเร็จ' : 'ยืนยันไม่สำเร็จ'}
      </Text>
      <Text style={styles.message}>{message}</Text>

      {ok && reservation !== undefined ? (
        <View style={styles.card}>
          <Row label="อาหาร" value={`${reservation.food_name} x ${reservation.quantity}`} />
          <Row label="ลูกค้า" value={reservation.customer_name} />
          <Row label="รับเงินสด" value={formatPrice(reservation.total_price)} highlight />
          <Row label="รหัสอ้างอิง" value={reservation.reservation_code} />

          <View style={styles.handOverBox}>
            <Ionicons name="bag-handle-outline" size={20} color={theme.colors.primaryDark} />
            <Text style={styles.handOverText}>
              ส่งมอบอาหารและรับเงินสด {formatPrice(reservation.total_price)} ได้เลย
            </Text>
          </View>
        </View>
      ) : null}

      <AppButton title={ok ? 'สแกนรายการถัดไป' : 'ลองใหม่อีกครั้ง'} onPress={onAgain} />
      <AppButton
        title="ปิด"
        variant="ghost"
        onPress={onClose}
        style={{ marginTop: theme.spacing.sm }}
      />
    </View>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight ? styles.rowValueHighlight : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: theme.spacing.md, alignItems: 'stretch' },
  iconCircle: {
    alignSelf: 'center',
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  iconOk: { backgroundColor: theme.colors.success },
  iconFail: { backgroundColor: theme.colors.error },

  title: { ...theme.textStyles.title, textAlign: 'center' },
  titleOk: { color: theme.colors.primaryDark },
  titleFail: { color: theme.colors.error },
  message: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  row: { flexDirection: 'row', paddingVertical: 5 },
  rowLabel: { ...theme.textStyles.bodyMuted, width: 110 },
  rowValue: { ...theme.textStyles.body, flex: 1, fontFamily: theme.fonts.medium },
  rowValueHighlight: { color: theme.colors.accent, fontFamily: theme.fonts.bold },

  handOverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm + 2,
    marginTop: theme.spacing.sm,
  },
  handOverText: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.primaryDark,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
});
