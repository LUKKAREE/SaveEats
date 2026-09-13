/**
 * ตั้งรหัสผ่านใหม่ในแอป (ไม่ต้องออกไปเปิดเบราว์เซอร์)
 *
 * ขั้นตอน : กรอกรหัส 6 หลักที่ได้จากอีเมล -> ตั้งรหัสผ่านใหม่ -> เข้าสู่ระบบ
 *
 * *** ทำไมต้องมีหน้านี้ ทั้งที่มีลิงก์ในอีเมลอยู่แล้ว ***
 * ลิงก์เปิดได้แต่ในเบราว์เซอร์ ผู้ใช้ต้องสลับแอปไปมา แล้วค่อยกลับมา login ใหม่
 * รหัส 6 หลักทำจนจบได้ในแอปเลย ไม่ต้องออกไปไหน
 * ทั้งสองทางชี้ไปที่คำขอใบเดียวกัน ใช้ทางไหนไปแล้วอีกทางใช้ไม่ได้
 *
 * *** ช่องกรอกรหัสทำเป็น 6 ช่องแยก แต่ข้างในเป็น TextInput ตัวเดียว ***
 * ถ้าทำ TextInput จริง 6 ตัว จะต้องเขียนโค้ดย้าย focus เองทุกครั้งที่พิมพ์/ลบ
 * ซึ่งพังง่ายมากเวลาผู้ใช้วางรหัสทั้งก้อน หรือกด backspace รัว ๆ
 * วิธีนี้คือวาดกล่อง 6 ใบไว้ดูอย่างเดียว แล้วซ่อน TextInput ตัวจริงทับไว้
 * ได้หน้าตาแบบ OTP ครบ โดยที่การพิมพ์ยังเป็นช่องข้อความธรรมดาที่ไม่มีบั๊ก
 */
import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../../../components/ScreenContainer';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';
import PasswordChecklist from '../../../components/PasswordChecklist';

import authService from '../authService';
import { errorMessage } from '../../../core/services/apiClient';
import { validatePassword } from '../../../core/utils/validators';
import { theme } from '../../../core/theme/theme';
import type { AuthScreenProps } from '../../../navigation/types';

const CODE_LENGTH = 6;

export default function ResetPasswordScreen({
  route, navigation,
}: AuthScreenProps<'ResetPassword'>): JSX.Element {
  const { email, demoCode, demoMode } = route.params;

  /*
   * ยังไม่ได้ผูกบัญชีส่งอีเมล = ผู้ใช้ไม่มีจดหมายให้เปิดหารหัส
   * จึงซ่อนช่องกรอกรหัสทิ้งไปทั้งก้อน เหลือแค่ตั้งรหัสผ่านใหม่อย่างเดียว
   *
   * *** ต้องดู demoMode ไม่ใช่ demoCode ***
   * demoCode เป็น null ได้ทั้งตอนตั้ง SMTP แล้ว และตอนอีเมลไม่มีในระบบ
   * ถ้าเอามาตัดสินหน้าจอ อีเมลที่ไม่มีจริงจะเห็นหน้าคนละแบบกับอีเมลที่มีจริง
   * ซึ่งเท่ากับบอกใบ้ว่าใครเป็นสมาชิก (เคยพลาดข้อนี้มาแล้ว 13 ก.ย. 2569)
   *
   * ผลของการใช้ demoMode : อีเมลมั่วก็เห็นหน้าจอเดียวกันเป๊ะ ตั้งรหัสได้ตามปกติ
   * แต่พอกดบันทึกจะขึ้นว่ารหัสไม่ถูกต้อง ซึ่งเป็นข้อความเดียวกับตอนกรอกรหัสผิด
   * แยกไม่ออกว่าอีเมลไม่มีจริง หรือแค่รหัสผิด ซึ่งเป็นพฤติกรรมที่ต้องการ
   */
  const isDemo = demoMode;

  // โหมดสาธิตกรอกรหัสให้เลย ผู้ใช้กดต่อได้ทันทีโดยไม่ต้องพิมพ์ตาม
  const [code, setCode] = useState(demoCode ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [errors, setErrors] = useState<{ code?: string; password?: string; confirm?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const codeInput = useRef<TextInput>(null);

  function validate(): boolean {
    const next: typeof errors = {};

    if (code.length !== CODE_LENGTH) {
      next.code = `กรุณากรอกรหัสให้ครบ ${CODE_LENGTH} หลัก`;
    }
    // ใช้กฎเดียวกับ Backend เสมอ ดูที่ shared/src/validation.ts
    const passwordError = validatePassword(password, { email });
    if (passwordError !== null) next.password = passwordError;
    if (confirm !== password) {
      next.confirm = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.resetPasswordWithCode(email, code, password);
      Alert.alert(
        'ตั้งรหัสผ่านใหม่แล้ว',
        'เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย',
        [{ text: 'เข้าสู่ระบบ', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  /** ขอรหัสใหม่ กรณีกรอกผิดหลายครั้งจนถูกล็อก หรือรหัสหมดอายุ */
  async function handleResend(): Promise<void> {
    setServerError(null);
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      setCode(result.demoCode ?? '');
      setErrors({});
      /*
       * ข้อความต้องขึ้นกับ demoMode เท่านั้น ไม่ใช่ว่ามี demoCode หรือไม่
       * ถ้าดูจาก demoCode อีเมลที่มีจริงจะเห็นตัวเลข ส่วนอีเมลมั่วจะเห็น
       * "ตรวจสอบกล่องจดหมาย" ซึ่งบอกใบ้ว่าอีเมลนั้นเป็นสมาชิกหรือเปล่า
       */
      Alert.alert(
        'ส่งรหัสใหม่แล้ว',
        result.demoMode
          ? 'ระบบกรอกรหัสใหม่ให้แล้ว ตั้งรหัสผ่านใหม่ได้เลย'
          : 'กรุณาตรวจสอบกล่องจดหมายอีกครั้ง รหัสเดิมใช้ไม่ได้แล้ว'
      );
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={44} color={theme.colors.primary} />
          </View>

          <Text style={styles.heading}>ตั้งรหัสผ่านใหม่</Text>
          <Text style={styles.subheading}>
            {isDemo ? (
              <>ตั้งรหัสผ่านใหม่สำหรับ{'\n'}<Text style={styles.email}>{email}</Text></>
            ) : (
              <>กรอกรหัส {CODE_LENGTH} หลักที่ส่งไปที่{'\n'}<Text style={styles.email}>{email}</Text></>
            )}
          </Text>

          {/*
            ---- ช่องกรอกรหัส 6 หลัก ----

            *** ทำไมซ่อนทั้งบล็อกในโหมดสาธิต ***
            เซิร์ฟเวอร์ยังไม่ได้ผูกบัญชีส่งอีเมล จึงส่งรหัสกลับมาให้แอปกรอกให้เอง
            การโชว์ช่องที่กรอกเสร็จแล้วไม่ได้ให้ผู้ใช้ทำอะไรต่อ มีแต่ทำให้สับสนว่า
            ต้องไปหาเลขนี้มาจากไหน ทั้งที่ระบบรู้อยู่แล้ว

            *** รหัสยังถูกตรวจเหมือนเดิมทุกประการ ***
            ค่า code ยังถูกส่งไปให้ Backend ตรวจ และยังใช้ได้ครั้งเดียวตาม RQ-010
            ที่เปลี่ยนคือ "สิ่งที่ตาเห็น" เท่านั้น ไม่ได้ถอดขั้นตอนความปลอดภัยออก
            พอตั้งค่า SMTP เมื่อไหร่ demoMode จะเป็น false ช่องนี้จะกลับมาแสดงเอง
          */}
          {isDemo ? null : (
            <>
              <Text style={styles.label}>รหัส {CODE_LENGTH} หลัก</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => codeInput.current?.focus()}
                style={styles.codeRow}
              >
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const digit = code[index] ?? '';
                  const isActive = index === code.length;
                  return (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={index}
                      style={[
                        styles.codeBox,
                        digit !== '' ? styles.codeBoxFilled : null,
                        isActive ? styles.codeBoxActive : null,
                      ]}
                    >
                      <Text style={styles.codeDigit}>{digit}</Text>
                    </View>
                  );
                })}

                {/* TextInput ตัวจริง ซ่อนทับกล่องทั้งแถวไว้ */}
                <TextInput
                  ref={codeInput}
                  value={code}
                  onChangeText={(text) => {
                    // รับเฉพาะตัวเลข กันกรณีวางข้อความที่มีช่องว่างหรือขีดติดมา
                    setCode(text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH));
                  }}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  style={styles.hiddenInput}
                  autoFocus
                />
              </TouchableOpacity>
              {errors.code !== undefined ? (
                <Text style={styles.fieldError}>{errors.code}</Text>
              ) : null}

              <View style={styles.divider} />
            </>
          )}

          <AppTextInput
            label="รหัสผ่านใหม่"
            value={password}
            onChangeText={setPassword}
            placeholder="อย่างน้อย 8 ตัว มีตัวใหญ่ เล็ก ตัวเลข อักขระพิเศษ"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password ?? null}
          />

          <PasswordChecklist value={password} />

          <AppTextInput
            label="ยืนยันรหัสผ่านใหม่"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.confirm ?? null}
          />

          {serverError !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.errorBoxText}>{serverError}</Text>
            </View>
          ) : null}

          <AppButton
            title="บันทึกรหัสผ่านใหม่"
            onPress={() => { void handleSubmit(); }}
            loading={loading}
          />

          {/* ปุ่มขอรหัสใหม่กับคำอธิบายอายุรหัส มีความหมายเฉพาะตอนที่ผู้ใช้
              ต้องไปหยิบรหัสจากอีเมลมากรอกเองเท่านั้น */}
          {isDemo ? null : (
            <>
              <AppButton
                title="ขอรหัสใหม่"
                variant="ghost"
                onPress={() => { void handleResend(); }}
                style={styles.gap}
              />

              <View style={styles.hintBox}>
                <Ionicons name="time-outline" size={16} color={theme.colors.primaryDark} />
                <Text style={styles.hintText}>
                  รหัสใช้ได้ภายใน 1 ชั่วโมง และใช้ได้ครั้งเดียว
                  กรอกผิดเกิน 5 ครั้งต้องกดขอรหัสใหม่
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  iconCircle: {
    alignSelf: 'center',
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  heading: {
    ...theme.textStyles.heading,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  subheading: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xxs,
    lineHeight: 22,
  },
  email: { color: theme.colors.primaryDark, fontFamily: theme.fonts.medium },

  demoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  demoText: { ...theme.textStyles.caption, color: theme.colors.warningText, flex: 1, lineHeight: 19 },
  demoBold: { fontFamily: theme.fonts.medium },

  label: {
    ...theme.textStyles.caption,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xs,
  },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  codeBox: {
    flex: 1,
    marginHorizontal: 3,
    height: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.primarySurface,
  },
  codeBoxActive: { borderColor: theme.colors.primary },
  codeDigit: {
    ...theme.textStyles.title,
    fontSize: 24,
    color: theme.colors.primaryDark,
  },
  /*
   * ทับกล่องทั้งแถวไว้แบบมองไม่เห็น
   * ต้องใช้ opacity 0 ไม่ใช่ display:none เพราะช่องที่ถูกซ่อนจริง ๆ
   * จะรับ focus ไม่ได้ คีย์บอร์ดก็จะไม่ขึ้น
   */
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    color: 'transparent',
  },
  fieldError: {
    ...theme.textStyles.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xl,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
  },
  errorBoxText: { ...theme.textStyles.bodyMuted, color: theme.colors.error, flex: 1 },

  gap: { marginTop: theme.spacing.sm },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  hintText: { ...theme.textStyles.caption, color: theme.colors.primaryDark, flex: 1 },
});
