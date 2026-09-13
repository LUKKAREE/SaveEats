/**
 * หน้าลืมรหัสผ่าน - ขั้นที่ 1 กรอกอีเมล
 *
 * กรอกอีเมล -> backend ออกรหัส 6 หลัก ส่งไปทางอีเมล
 *           -> ไปหน้า ResetPassword กรอกรหัสแล้วตั้งรหัสใหม่ในแอปได้เลย
 *
 * *** ทำไมใช้รหัส 6 หลัก ไม่ใช่ลิงก์อย่างเดียว ***
 * ลิงก์เปิดได้แต่ในเบราว์เซอร์ ผู้ใช้ต้องสลับแอปไปมาแล้วค่อยกลับมา login ใหม่
 * รหัส 6 หลักพิมพ์ตามในแอปได้เลย จบในที่เดียว
 * backend ออกให้ทั้งสองอย่างพร้อมกัน ผู้ใช้เลือกทางที่สะดวกกว่า
 *
 * *** ต้องเป็นอีเมลที่สมัครไว้แล้วเท่านั้น ***
 * ถ้ากรอกอีเมลที่ไม่มีในระบบ backend จะตอบ 404 กลับมา
 * หน้านี้จะขึ้นกล่องแดงว่า "ไม่พบอีเมลนี้ในระบบ" แล้วหยุดอยู่ตรงนี้
 * ไม่พาไปหน้าตั้งรหัสผ่านใหม่ เพราะไม่มีบัญชีให้เปลี่ยนตั้งแต่แรก
 *
 * ผู้ใช้จึงรู้ทันทีว่าพิมพ์อีเมลผิด ไม่ต้องเดินจนสุดทางแล้วค่อยล้มเหลว
 */
import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../../../components/ScreenContainer';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';

import authService from '../authService';
import { errorMessage } from '../../../core/services/apiClient';
import { validateEmail } from '../../../core/utils/validators';
import { theme } from '../../../core/theme/theme';
import type { AuthScreenProps } from '../../../navigation/types';

export default function ForgotPasswordScreen({
  navigation,
}: AuthScreenProps<'ForgotPassword'>): JSX.Element {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  /** รหัสที่ backend ส่งกลับมา มีค่าเฉพาะโหมดสาธิตและอีเมลนั้นมีอยู่จริง */
  const [demoCode, setDemoCode] = useState<string | null>(null);
  /** เซิร์ฟเวอร์ยังไม่ได้ผูกบัญชีส่งอีเมลหรือไม่ (ไม่ขึ้นกับว่าอีเมลมีจริงไหม) */
  const [demoMode, setDemoMode] = useState(false);

  async function handleSubmit(): Promise<void> {
    setServerError(null);

    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError !== null) return;

    setLoading(true);
    try {
      const result = await authService.forgotPassword(email.trim());

      /*
       * *** โหมดสาธิต : ข้ามหน้าคั่น "ส่งรหัสให้แล้ว" ไปเลย ***
       *
       * หน้าคั่นนั้นมีไว้บอกผู้ใช้ให้ไปเปิดกล่องจดหมาย ซึ่งมีประโยชน์ต่อเมื่อ
       * เซิร์ฟเวอร์ส่งอีเมลได้จริง ตอนที่ยังไม่ได้ผูกบัญชีส่งอีเมล ผู้ใช้ไม่มี
       * จดหมายให้เปิด การบังคับให้หยุดอ่านหน้านั้นจึงเป็นการขวางทางเปล่า ๆ
       *
       * *** ต้องเช็ค demoMode ห้ามเช็ค demoCode ***
       * demoCode เป็น null ตอนที่อีเมลไม่มีในระบบด้วย ถ้าเอามาตัดสินตรงนี้
       * อีเมลที่มีจริงจะข้ามหน้าคั่น ส่วนอีเมลมั่วจะไม่ข้าม กลายเป็นว่า
       * หน้าจอบอกใบ้ว่าอีเมลนั้นเป็นสมาชิกหรือเปล่า
       * (เคยพลาดข้อนี้มาแล้ว 13 ก.ย. 2569 จึงเขียนเตือนไว้)
       *
       * demoMode คำนวณจากการตั้งค่า SMTP อย่างเดียว ทุกอีเมลจึงเดินทางเดียวกัน
       * พอตั้งค่า SMTP เมื่อไหร่ ค่านี้เป็น false เอง หน้าคั่นก็กลับมาทำงานตามเดิม
       */
      if (result.demoMode) {
        navigation.navigate('ResetPassword', {
          email: email.trim(),
          demoCode: result.demoCode,
          demoMode: true,
        });
        return;
      }

      setDemoCode(result.demoCode);
      setDemoMode(result.demoMode);
      setSent(true);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ---- ส่งเรียบร้อยแล้ว ----
  if (sent) {
    return (
      <ScreenContainer>
        <View style={styles.doneWrap}>
          <View style={styles.doneCircle}>
            <Ionicons name="mail-open-outline" size={56} color={theme.colors.primary} />
          </View>

          <Text style={styles.doneTitle}>ส่งรหัสให้แล้ว</Text>
          <Text style={styles.doneMessage}>
            ถ้าอีเมล{'\n'}
            <Text style={styles.doneEmail}>{email.trim()}</Text>{'\n'}
            มีอยู่ในระบบ เราได้ส่งรหัส 6 หลักไปให้แล้ว
          </Text>

          <View style={styles.hintBox}>
            <Ionicons name="time-outline" size={16} color={theme.colors.primaryDark} />
            <Text style={styles.hintText}>
              รหัสใช้ได้ภายใน 1 ชั่วโมง และใช้ได้ครั้งเดียว
              ถ้าไม่เจอในกล่องจดหมาย ลองดูในโฟลเดอร์สแปมด้วย
            </Text>
          </View>

          <AppButton
            title="กรอกรหัสแล้วตั้งรหัสผ่านใหม่"
            onPress={() =>
              navigation.navigate('ResetPassword', { email: email.trim(), demoCode, demoMode })
            }
            style={styles.doneButton}
          />

          <AppButton
            title="ส่งอีกครั้ง"
            variant="ghost"
            onPress={() => { setSent(false); }}
          />

          <AppButton
            title="กลับไปเข้าสู่ระบบ"
            variant="ghost"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ---- ฟอร์มกรอกอีเมล ----
  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.iconWrap}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed" size={52} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={styles.heading}>กรอกอีเมลที่ใช้สมัครสมาชิก</Text>
        <Text style={styles.subheading}>
          เราจะส่งรหัส 6 หลักไปให้ทางอีเมล เอามากรอกในแอปเพื่อตั้งรหัสผ่านใหม่
        </Text>

        {serverError !== null ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={styles.errorBoxText}>{serverError}</Text>
          </View>
        ) : null}

        <AppTextInput
          label="อีเมล"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          leftIcon="mail-outline"
          error={error}
        />

        <AppButton
          title="ส่งรหัสตั้งรหัสผ่านใหม่"
          onPress={() => { void handleSubmit(); }}
          loading={loading}
        />

        <AppButton
          title="กลับไปเข้าสู่ระบบ"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  iconWrap: { alignItems: 'center', marginTop: theme.spacing.lg },
  lockCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },

  heading: {
    ...theme.textStyles.heading,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  subheading: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
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

  backButton: { marginTop: theme.spacing.sm },

  // ---- หน้าจอหลังส่งสำเร็จ ----
  doneWrap: { flex: 1, justifyContent: 'center' },
  doneCircle: {
    alignSelf: 'center',
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  doneTitle: { ...theme.textStyles.heading, textAlign: 'center' },
  doneMessage: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 24,
  },
  doneEmail: { color: theme.colors.primaryDark, fontFamily: theme.fonts.medium },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xl,
  },
  hintText: { ...theme.textStyles.caption, color: theme.colors.primaryDark, flex: 1 },

  doneButton: { marginBottom: theme.spacing.sm },
});
