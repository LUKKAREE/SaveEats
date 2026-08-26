/**
 * หน้าสมัครสมาชิก
 *
 * รองรับทั้งลูกค้าและร้านค้าในหน้าเดียว (ข้อค้าง 5 : ร้านสมัครเองแล้วรออนุมัติ)
 * เลือกประเภทด้วยปุ่มสลับด้านบน ถ้าเลือกร้านค้าจะมีช่องชื่อร้านโผล่มาเพิ่ม
 */
import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';
import { theme } from '../../../core/theme/theme';
import { errorMessage } from '../../../core/services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import type { RegisterFormData } from '../authService';
import {
  validateName, validateEmail, validatePassword, validateConfirmPassword,
  validatePhone, validateStoreName, validateForm,
} from '../../../core/utils/validators';
import type { AuthScreenProps } from '../../../navigation/types';
import PasswordChecklist from '../../../components/PasswordChecklist';

/** ช่องที่ตรวจความถูกต้อง */
type FieldName = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'storeName';

/** ฟอร์มไม่รวมพิกัด (พิกัดปักหมุดทีหลังในหน้าจัดการร้าน) */
type FormState = Omit<RegisterFormData, 'role' | 'latitude' | 'longitude'>;

const EMPTY_FORM: FormState = {
  name: '', email: '', phone: '', password: '', confirmPassword: '',
  storeName: '', address: '',
};

export default function RegisterScreen({ navigation }: AuthScreenProps<'Register'>): JSX.Element {
  const { register } = useAuth();

  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('customer');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** ติ๊กยอมรับข้อกำหนดแล้วหรือยัง ถ้ายังจะกดสมัครไม่ได้ */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  const isSeller = role === 'seller';

  /** สร้างฟังก์ชันแก้ค่าของช่องหนึ่ง (keyof FormState = พิมพ์ชื่อช่องผิดจะฟ้อง) */
  const setField = (key: keyof FormState) => (value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleRegister(): Promise<void> {
    setServerError(null);

    const rules: Record<FieldName, () => string | null> = {
      name: () => validateName(form.name),
      email: () => validateEmail(form.email),
      phone: () => validatePhone(form.phone, isSeller),
      // ส่งอีเมลกับชื่อไปด้วย เพื่อกันตั้งรหัสเป็นชื่อตัวเอง
      // ต้องส่งชุดเดียวกับที่ Backend ใช้ ไม่งั้นแอปจะบอกผ่านแต่ server ปฏิเสธ
      password: () => validatePassword(form.password, {
        email: form.email,
        name: form.name,
      }),
      confirmPassword: () => validateConfirmPassword(form.password, form.confirmPassword),
      storeName: () => (isSeller ? validateStoreName(form.storeName) : null),
    };

    const { isValid, errors: formErrors } = validateForm(rules);
    setErrors(formErrors);

    // ข้อกำหนดการใช้งานเช็คแยก เพราะไม่ใช่ช่องกรอกข้อความเหมือนช่องอื่น
    const termsMessage = acceptedTerms ? null : 'กรุณายอมรับข้อกำหนดการใช้งานก่อนสมัคร';
    setTermsError(termsMessage);

    if (!isValid || termsMessage !== null) return;

    setLoading(true);
    try {
      await register({ ...form, role });
      // สมัครเสร็จ RootNavigator จะพาเข้าแอปให้เอง
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
        <Text style={styles.title}>สร้างบัญชีใหม่</Text>
        <Text style={styles.subtitle}>เลือกว่าคุณจะใช้ SaveEats ในฐานะอะไร</Text>

        {/* ---- ปุ่มสลับประเภทผู้ใช้ ---- */}
        <View style={styles.roleRow}>
          <RoleCard
            active={!isSeller}
            icon="person-outline"
            title="ลูกค้า"
            description="ค้นหาและจองอาหาร"
            onPress={() => setRole('customer')}
          />
          <RoleCard
            active={isSeller}
            icon="storefront-outline"
            title="ร้านค้า"
            description="ลงขายอาหารเหลือ"
            onPress={() => setRole('seller')}
          />
        </View>

        {isSeller ? (
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} />
            <Text style={styles.noticeText}>
              ร้านค้าต้องรอผู้ดูแลระบบตรวจสอบและอนุมัติก่อน จึงจะเริ่มลงขายได้
            </Text>
          </View>
        ) : null}

        {serverError !== null ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={styles.errorBoxText}>{serverError}</Text>
          </View>
        ) : null}

        {/* ---- ฟอร์ม ---- */}
        <View style={styles.card}>
          <AppTextInput
            label={isSeller ? 'ชื่อผู้ติดต่อ' : 'ชื่อ-นามสกุล'}
            value={form.name} onChangeText={setField('name')}
            placeholder="เช่น สมชาย ใจดี"
            autoCapitalize="words" leftIcon="person-outline" error={errors.name ?? null}
          />

          {isSeller ? (
            <>
              <AppTextInput
                label="ชื่อร้าน"
                value={form.storeName} onChangeText={setField('storeName')}
                placeholder="เช่น ครัวคุณแม่"
                leftIcon="storefront-outline" error={errors.storeName ?? null}
              />
              <AppTextInput
                label="ที่อยู่ร้าน"
                value={form.address} onChangeText={setField('address')}
                placeholder="บ้านเลขที่ ถนน แขวง เขต"
                multiline
                helperText="ปักหมุดตำแหน่งบนแผนที่ได้ทีหลังในหน้าจัดการร้าน"
              />
            </>
          ) : null}

          <AppTextInput
            label="อีเมล"
            value={form.email} onChangeText={setField('email')}
            placeholder="you@example.com"
            keyboardType="email-address" leftIcon="mail-outline" error={errors.email ?? null}
          />
          <AppTextInput
            label={isSeller ? 'เบอร์โทรร้าน' : 'เบอร์โทร (ไม่บังคับ)'}
            value={form.phone} onChangeText={setField('phone')}
            placeholder="0812345678"
            keyboardType="phone-pad" leftIcon="call-outline" error={errors.phone ?? null}
          />
          <AppTextInput
            label="รหัสผ่าน"
            value={form.password} onChangeText={setField('password')}
            placeholder="อย่างน้อย 8 ตัว มีตัวใหญ่ เล็ก ตัวเลข อักขระพิเศษ"
            secureTextEntry leftIcon="lock-closed-outline" error={errors.password ?? null}
          />

          {/* รายการเงื่อนไข ติ๊กถูกทันทีขณะพิมพ์ ผู้ใช้จะได้ไม่ต้องเดาว่าขาดอะไร */}
          <PasswordChecklist value={form.password} />
          <AppTextInput
            label="ยืนยันรหัสผ่าน"
            value={form.confirmPassword} onChangeText={setField('confirmPassword')}
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            secureTextEntry leftIcon="lock-closed-outline" error={errors.confirmPassword ?? null}
          />

          {/* ---- ยอมรับข้อกำหนด ---- */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => {
              setAcceptedTerms((prev) => !prev);
              setTermsError(null);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedTerms ? styles.checkboxChecked : null]}>
              {acceptedTerms ? (
                <Ionicons name="checkmark" size={15} color={theme.colors.textOnPrimary} />
              ) : null}
            </View>
            <Text style={styles.termsText}>
              ฉันยอมรับ<Text style={styles.termsLink}>ข้อกำหนดการใช้งาน</Text>
              และ<Text style={styles.termsLink}>นโยบายความเป็นส่วนตัว</Text>
            </Text>
          </TouchableOpacity>

          {termsError !== null ? (
            <Text style={styles.termsErrorText}>{termsError}</Text>
          ) : null}

          <AppButton
            title={isSeller ? 'สมัครและส่งคำขอเปิดร้าน' : 'สมัครสมาชิก'}
            onPress={() => { void handleRegister(); }}
            loading={loading}
          />
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
          <Text style={styles.backText}>มีบัญชีอยู่แล้ว เข้าสู่ระบบ</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

interface RoleCardProps {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}

/** การ์ดเลือกประเภทผู้ใช้ */
function RoleCard({ active, icon, title, description, onPress }: RoleCardProps): JSX.Element {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.roleCard, active ? styles.roleCardActive : null]}
    >
      <Ionicons name={icon} size={28} color={active ? theme.colors.primary : theme.colors.textMuted} />
      <Text style={[styles.roleTitle, active ? styles.roleTitleActive : null]}>{title}</Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  title: { ...theme.textStyles.title },
  subtitle: { ...theme.textStyles.bodyMuted, marginBottom: theme.spacing.md },

  roleRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  roleCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  roleCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySurface },
  roleTitle: {
    ...theme.textStyles.subheading,
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
  },
  roleTitleActive: { color: theme.colors.primaryDark },
  roleDescription: { ...theme.textStyles.caption, textAlign: 'center' },

  noticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.infoBg,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
  },
  noticeText: {
    ...theme.textStyles.caption,
    color: theme.colors.info,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

  errorBox: {
    flexDirection: 'row',
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

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    width: 22, height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
    // ดันลงนิดหนึ่งให้เส้นบนของกล่องตรงกับบรรทัดแรกของข้อความ
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  termsText: { ...theme.textStyles.caption, flex: 1, lineHeight: 20 },
  termsLink: { color: theme.colors.primaryDark, fontFamily: theme.fonts.medium },
  termsErrorText: {
    ...theme.textStyles.caption,
    color: theme.colors.error,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },

  backWrap: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  backText: { ...theme.textStyles.bodyMuted, color: theme.colors.primary },
});
