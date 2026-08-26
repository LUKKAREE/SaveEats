/**
 * กรอกรหัส 4 หลัก - ทางสำรองเมื่อสแกน QR ไม่ได้
 *
 * *** ปลอดภัยเท่าการสแกน QR ***
 * เพราะ Backend ค้นเฉพาะการจองของร้านที่ login อยู่เท่านั้น
 * รหัส 4 หลักซ้ำกันได้ระหว่างร้าน แต่ข้ามร้านกันไม่ได้
 */
import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../../components/ScreenContainer';
import AppButton from '../../components/AppButton';
import LoadingView from '../../components/LoadingView';
import VerifyResultView from './VerifyResultView';
import type { VerifyResult } from './VerifyResultView';

import reservationService from '../../features/reservation/reservationService';
import { errorMessage } from '../../core/services/apiClient';
import { validateReservationCode } from '../../core/utils/validators';
import { theme } from '../../core/theme/theme';
import type { SellerScreenProps } from '../../navigation/types';

type Props = SellerScreenProps<'SellerEnterCode'>;

const CODE_LENGTH = 4;

export default function EnterReservationCodeScreen({ navigation }: Props): JSX.Element {
  /** เก็บตัวเลขทีละหลัก จะได้ทำช่องแยก 4 ช่องได้ */
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const inputs = useRef<Array<TextInput | null>>([]);
  const code = digits.join('');

  function handleChange(index: number, text: string): void {
    // เอาเฉพาะตัวเลข และเอาแค่ตัวสุดท้าย (เผื่อผู้ใช้วางข้อความ)
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError(null);

    // พิมพ์แล้วเด้งไปช่องถัดไปเอง
    if (digit !== '' && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string): void {
    // กดลบในช่องที่ว่างอยู่ ให้ถอยไปช่องก่อนหน้า
    if (key === 'Backspace' && digits[index] === '' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(): Promise<void> {
    const message = validateReservationCode(code);
    setError(message);
    if (message !== null) return;

    setChecking(true);
    try {
      // *** ส่งไปให้ Backend ตรวจ ไม่ตรวจเอง (กฎเหล็กข้อ 4) ***
      const reservation = await reservationService.verify({ code });
      setResult({ ok: true, message: 'รับอาหารเรียบร้อยแล้ว', reservation });
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err) });
    } finally {
      setChecking(false);
    }
  }

  function tryAgain(): void {
    setResult(null);
    setDigits(Array(CODE_LENGTH).fill(''));
    setError(null);
    inputs.current[0]?.focus();
  }

  if (checking) {
    return <ScreenContainer><LoadingView message="กำลังตรวจสอบกับระบบ..." /></ScreenContainer>;
  }

  if (result !== null) {
    return (
      <ScreenContainer padded={false}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <VerifyResultView
            result={result}
            onAgain={tryAgain}
            onClose={() => navigation.goBack()}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Ionicons name="keypad-outline" size={40} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>กรอกรหัส 4 หลัก</Text>
          <Text style={styles.subtitle}>
            ขอรหัสจากลูกค้า รหัสจะอยู่ใต้ QR Code บนหน้าจอของลูกค้า
          </Text>

          <View style={styles.codeRow}>
            {digits.map((digit, index) => (
              <TextInput
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                ref={(el) => { inputs.current[index] = el; }}
                style={[
                  styles.codeInput,
                  digit !== '' ? styles.codeInputFilled : null,
                  error !== null ? styles.codeInputError : null,
                ]}
                value={digit}
                onChangeText={(text) => handleChange(index, text)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
                accessibilityLabel={`รหัสหลักที่ ${index + 1}`}
              />
            ))}
          </View>

          {error !== null ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            title="ยืนยันการรับอาหาร"
            onPress={() => { void handleSubmit(); }}
            disabled={code.length < CODE_LENGTH}
            style={{ marginTop: theme.spacing.lg }}
          />

          <AppButton
            title="กลับไปสแกน QR"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: theme.spacing.sm }}
          />

          <View style={styles.noticeBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.info} />
            <Text style={styles.noticeText}>
              ระบบจะค้นเฉพาะการจองของร้านคุณเท่านั้น
              {'\n'}รหัสของร้านอื่นใช้ที่นี่ไม่ได้
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.md, alignItems: 'stretch' },

  iconCircle: {
    alignSelf: 'center',
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  title: { ...theme.textStyles.title, textAlign: 'center' },
  subtitle: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },

  codeRow: { flexDirection: 'row', justifyContent: 'center' },
  codeInput: {
    width: 62, height: 74,
    marginHorizontal: theme.spacing.xs + 2,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.textStyles.title,
    fontSize: 32,
  },
  codeInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  codeInputError: { borderColor: theme.colors.error, backgroundColor: theme.colors.errorBg },
  error: {
    ...theme.textStyles.caption,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },

  noticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.infoBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  noticeText: {
    ...theme.textStyles.caption,
    color: theme.colors.info,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

  resultScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: theme.spacing.lg },
});
