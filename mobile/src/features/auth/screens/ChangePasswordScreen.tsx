/**
 * เปลี่ยนรหัสผ่าน (สำหรับผู้ใช้ที่ล็อกอินอยู่แล้ว)
 *
 * *** ต่างจากหน้า "ลืมรหัสผ่าน" อย่างไร ***
 *   ลืมรหัสผ่าน   ใช้ตอนเข้าแอปไม่ได้เลย ต้องพิสูจน์ตัวตนผ่านรหัสที่ส่งไปทางอีเมล
 *   หน้านี้        ใช้ตอนเข้าแอปได้อยู่แล้ว แค่อยากเปลี่ยนรหัส
 *
 * *** ทำไมต้องกรอกรหัสผ่านเดิมด้วย ***
 * เพราะมันคือตัวพิสูจน์ว่าคนที่กำลังกดอยู่คือเจ้าของบัญชีจริง ไม่ใช่คนที่หยิบ
 * มือถือที่เปิดค้างไว้ไปกด ถ้าไม่ขอรหัสเดิม ใครหยิบเครื่องที่ยังไม่ล็อกหน้าจอได้
 * ก็ยึดบัญชีไปได้เลยโดยที่เจ้าของกลับเข้าไม่ได้อีก
 * Backend ก็ตรวจซ้ำอีกชั้นอยู่แล้ว (กฎเหล็กข้อ 3) ที่ตรวจตรงนี้เพื่อให้เห็น error เร็ว
 *
 * *** ทำไมไม่เด้งออกจากระบบหลังเปลี่ยนเสร็จ ***
 * token เดิมยังใช้ได้ต่อ เพราะคนที่เปลี่ยนคือเจ้าของเครื่องนี้เอง
 * การบังคับให้ล็อกอินใหม่ทันทีเป็นการลงโทษคนที่ทำถูกต้อง
 *
 * API : PUT /api/auth/password
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenContainer from '../../../components/ScreenContainer';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';
import PasswordChecklist from '../../../components/PasswordChecklist';

import authService from '../authService';
import { useAuth } from '../../../context/AuthContext';
import { errorMessage } from '../../../core/services/apiClient';
import { validatePassword } from '../../../core/utils/validators';
import { theme } from '../../../core/theme/theme';
import type { AppStackParamList } from '../../../navigation/types';

/*
 * หน้านี้ถูกใช้ทั้งใน stack ของลูกค้าและของร้านค้า
 * จึงรับ navigation ผ่าน useNavigation ที่ครอบทั้งสองฝั่ง แบบเดียวกับ EditProfileScreen
 */
type Navigation = NativeStackNavigationProp<AppStackParamList>;

export default function ChangePasswordScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [errors, setErrors] = useState<{ current?: string; password?: string; confirm?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};

    if (current === '') {
      next.current = 'กรุณากรอกรหัสผ่านเดิม';
    }

    // ใช้กฎเดียวกับ Backend เสมอ ดูที่ shared/src/validation.ts
    const passwordError = validatePassword(password, { email: user?.email });
    if (passwordError !== null) {
      next.password = passwordError;
    } else if (password === current) {
      /*
       * กันกรณีกรอกรหัสเดิมซ้ำในช่องรหัสใหม่
       * ถ้าปล่อยผ่าน ระบบจะตอบว่าบันทึกสำเร็จทั้งที่ไม่มีอะไรเปลี่ยน
       * ผู้ใช้จะเข้าใจผิดว่าเปลี่ยนแล้วทั้งที่รหัสเดิมยังใช้ได้อยู่
       */
      next.password = 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม';
    }

    if (confirm !== password) {
      next.confirm = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(): Promise<void> {
    setServerError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await authService.changePassword(current, password);
      Alert.alert(
        'เปลี่ยนรหัสผ่านแล้ว',
        'ครั้งต่อไปที่เข้าสู่ระบบ ให้ใช้รหัสผ่านใหม่นี้',
        [{ text: 'เข้าใจแล้ว', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      /*
       * กรณีที่เจอบ่อยที่สุดคือกรอกรหัสเดิมผิด
       * Backend ส่งข้อความภาษาไทยมาให้อยู่แล้ว จึงแสดงตามนั้นเลย ไม่แปลซ้ำ
       */
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
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
            <Ionicons name="key-outline" size={40} color={theme.colors.primary} />
          </View>

          <Text style={styles.heading}>เปลี่ยนรหัสผ่าน</Text>
          <Text style={styles.subheading}>
            กรอกรหัสผ่านเดิมเพื่อยืนยันว่าเป็นคุณ{'\n'}แล้วตั้งรหัสผ่านใหม่ได้เลย
          </Text>

          <AppTextInput
            label="รหัสผ่านเดิม"
            value={current}
            onChangeText={setCurrent}
            placeholder="รหัสผ่านที่ใช้อยู่ตอนนี้"
            secureTextEntry
            leftIcon="lock-closed-outline"
            error={errors.current ?? null}
          />

          <View style={styles.divider} />

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
            loading={saving}
          />

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primaryDark} />
            <Text style={styles.hintText}>
              ถ้าจำรหัสผ่านเดิมไม่ได้ ให้ออกจากระบบแล้วกด "ลืมรหัสผ่าน"
              ที่หน้าเข้าสู่ระบบแทน
            </Text>
          </View>
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
    width: 84, height: 84, borderRadius: 42,
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
    ...theme.textStyles.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },

  /* เส้นคั่นให้เห็นชัดว่า "ของเดิม" กับ "ของใหม่" เป็นคนละส่วนกัน */
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorBoxText: {
    ...theme.textStyles.caption,
    color: theme.colors.error,
    flex: 1,
  },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  hintText: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    flex: 1,
  },
});
