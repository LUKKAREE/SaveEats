/**
 * หน้าเข้าสู่ระบบ
 *
 * หลัก UX ที่ใช้ในหน้านี้
 *   - ตรวจข้อมูลตอนกดปุ่ม ไม่ใช่ตอนพิมพ์ (ไม่ให้ error เด้งใส่หน้าตั้งแต่ตัวแรก)
 *   - error ของ server แสดงเป็นกล่องแดงด้านบน อ่านง่าย ไม่ใช้ alert เด้ง
 *   - ปุ่มเข้าสู่ระบบจะกดซ้ำไม่ได้ระหว่างรอผล
 *   - KeyboardAvoidingView กันคีย์บอร์ดบังช่องกรอก
 */
import { useState } from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenContainer from '../../../components/ScreenContainer';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';
import { theme } from '../../../core/theme/theme';
import { APP_NAME, APP_TAGLINE } from '../../../core/constants/appConstants';
import { errorMessage } from '../../../core/services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { validateLoginPassword, validateForm } from '../../../core/utils/validators';
import type { AuthScreenProps } from '../../../navigation/types';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>): JSX.Element {
  const { login } = useAuth();

  /** ช่องแรก กรอกได้ทั้งอีเมลและเบอร์โทรศัพท์ backend หาให้เองว่าตรงกับใคร */
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'identifier' | 'password', string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(): Promise<void> {
    setServerError(null);

    /*
     * ตรวจช่องแรกแค่ว่า "ไม่ว่าง" พอ ไม่ได้บังคับให้เป็นรูปแบบอีเมล
     * เพราะผู้ใช้กรอกเบอร์โทรมาก็ได้ ถ้าไปบังคับรูปแบบอีเมล
     * คนที่กรอกเบอร์จะโดนปัดตกตั้งแต่ยังไม่ได้ยิงไปถาม backend
     */
    const { isValid, errors: formErrors } = validateForm({
      identifier: () => (identifier.trim() === '' ? 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์' : null),
      // ตอน login เช็คแค่ว่าไม่ว่าง ไม่เช็คความแข็งแรง ดูเหตุผลที่ validators.ts
      password: () => validateLoginPassword(password),
    });
    setErrors(formErrors);
    if (!isValid) return;

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      // ไม่ต้อง navigate เอง RootNavigator จะสลับหน้าให้อัตโนมัติเมื่อ user เปลี่ยน
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* ---- ส่วนหัวแบรนด์ ---- */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            {/* ใช้โลโก้ตัวเดียวกับไอคอนแอป เพื่อให้หน้าตาแบรนด์ตรงกันทุกที่ */}
            <Image
              source={require('../../../../assets/images/logo-mark-white.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        {/* ---- ฟอร์ม ---- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เข้าสู่ระบบ</Text>

          {serverError !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.errorBoxText}>{serverError}</Text>
            </View>
          ) : null}

          <AppTextInput
            label="อีเมลหรือเบอร์โทรศัพท์"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@example.com หรือ 0812345678"
            // ไม่ล็อกเป็น email-address เพราะต้องพิมพ์ตัวเลขได้ด้วย
            keyboardType="default"
            leftIcon="person-outline"
            error={errors.identifier ?? null}
          />

          <AppTextInput
            label="รหัสผ่าน"
            value={password}
            onChangeText={setPassword}
            placeholder="กรอกรหัสผ่านของคุณ"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.password ?? null}
          />

          {/* ---- ลืมรหัสผ่าน วางชิดขวาใต้ช่องรหัสผ่านตามที่คนคุ้นเคย ---- */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
          >
            <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
          </TouchableOpacity>

          <AppButton title="เข้าสู่ระบบ" onPress={() => { void handleLogin(); }} loading={loading} />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>หรือ</Text>
            <View style={styles.line} />
          </View>

          <AppButton
            title="สมัครสมาชิกใหม่"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.spacing.md },
  header: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  logoImage: { width: 44, height: 44 },
  appName: { ...theme.textStyles.title, color: theme.colors.primaryDark },
  tagline: { ...theme.textStyles.bodyMuted, marginTop: theme.spacing.xxs },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  cardTitle: { ...theme.textStyles.heading, marginBottom: theme.spacing.lg },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
  },
  errorBoxText: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.error,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  forgotText: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.medium,
  },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.md },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { ...theme.textStyles.caption, marginHorizontal: theme.spacing.sm },

});
