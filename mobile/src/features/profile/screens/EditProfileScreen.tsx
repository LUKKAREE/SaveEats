/**
 * แก้ไขข้อมูลส่วนตัว (ใช้ได้จริงแล้ว)
 *
 * *** แก้ได้แค่ ชื่อ / เบอร์โทร / รูปโปรไฟล์ ***
 * อีเมลเปลี่ยนไม่ได้ เพราะเป็นตัวระบุตัวตนตอน login
 * ถ้าจะให้เปลี่ยนได้ ต้องมีระบบยืนยันอีเมลก่อน ไม่งั้นจะเข้าบัญชีตัวเองไม่ได้
 *
 * API : PUT /api/auth/me  (ส่งเป็น multipart เพราะอาจมีไฟล์รูป)
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenContainer from '../../../components/ScreenContainer';
import AppTextInput from '../../../components/AppTextInput';
import AppButton from '../../../components/AppButton';
import FormSection from '../../../components/FormSection';
import ImagePickerField from '../../../components/ImagePickerField';

import authService from '../../auth/authService';
import { useAuth } from '../../../context/AuthContext';
import { errorMessage } from '../../../core/services/apiClient';
import type { PickedImage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { theme } from '../../../core/theme/theme';
import type { AppStackParamList } from '../../../navigation/types';

/*
 * หน้านี้ถูกใช้ทั้งใน stack ของลูกค้าและของร้านค้า
 * จึงรับ navigation ผ่าน useNavigation ที่ครอบทั้งสองฝั่ง
 * แทนการรับเป็น props ซึ่งจะผูกติดกับ stack เดียว
 */
type Navigation = NativeStackNavigationProp<AppStackParamList>;

export default function EditProfileScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { user, refresh } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});

  /**
   * ตรวจข้อมูลฝั่งแอปก่อนส่ง
   *
   * *** ไม่ได้ตรวจแทน Backend ***
   * Backend ตรวจอีกรอบเสมอ (กฎเหล็กข้อ 3)
   * ที่ตรวจตรงนี้เพื่อให้ผู้ใช้เห็น error เร็ว ไม่ต้องรอเน็ตไปกลับ
   */
  function validate(): boolean {
    const next: typeof errors = {};

    if (name.trim() === '') {
      next.name = 'กรุณากรอกชื่อ';
    } else if (name.trim().length > 100) {
      next.name = 'ชื่อยาวเกินไป';
    }

    if (phone.trim() !== '' && !/^[0-9]{9,10}$/.test(phone.trim())) {
      next.phone = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(): Promise<void> {
    if (!validate()) return;

    setSaving(true);
    setErrors({});
    try {
      await authService.updateProfile(
        { name: name.trim(), phone: phone.trim() },
        image
      );
      // ดึงข้อมูลใหม่เข้า Context เพื่อให้หน้าโปรไฟล์เห็นชื่อใหม่ทันที
      await refresh();

      Alert.alert('บันทึกแล้ว', 'ข้อมูลส่วนตัวของคุณถูกอัปเดตเรียบร้อย', [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FormSection title="รูปโปรไฟล์" hint="ไม่บังคับ ถ้าไม่เลือกจะใช้รูปเดิม">
          <ImagePickerField
            value={image}
            currentImageUrl={imageUrl(user?.avatar ?? null, 'profile')}
            onChange={setImage}
            label="เลือกรูปโปรไฟล์"
            /*
              รูปโปรไฟล์แสดงในกรอบวงกลม จึงล็อกให้ตัดเป็นสี่เหลี่ยมจัตุรัส
              ถ้าปล่อยอิสระแล้วผู้ใช้เลือกรูปยาว ๆ มา วงกลมจะตัดจนไม่เหลืออะไร
            */
            aspect={[1, 1]}
          />
        </FormSection>

        <FormSection title="ข้อมูลส่วนตัว">
          <AppTextInput
            label="ชื่อ"
            value={name}
            onChangeText={setName}
            placeholder="ชื่อที่จะแสดงให้ร้านเห็นตอนมารับอาหาร"
            error={errors.name}
          />

          <AppTextInput
            label="เบอร์โทร"
            value={phone}
            onChangeText={setPhone}
            placeholder="0812345678"
            keyboardType="phone-pad"
            error={errors.phone}
          />

          {/* อีเมล : แสดงให้เห็นแต่แก้ไม่ได้ */}
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>อีเมล</Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyValue}>{user?.email}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.readOnlyHint}>
              อีเมลใช้สำหรับเข้าสู่ระบบ จึงเปลี่ยนเองไม่ได้ ถ้าต้องการเปลี่ยนให้ติดต่อผู้ดูแลระบบ
            </Text>
          </View>
        </FormSection>

        {errors.form !== undefined ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
            <Text style={styles.errorText}>{errors.form}</Text>
          </View>
        ) : null}

        <AppButton
          title="บันทึกข้อมูล"
          loading={saving}
          onPress={() => { void handleSave(); }}
        />
        <AppButton
          title="ยกเลิก"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: theme.spacing.sm }}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  readOnlyField: { marginBottom: theme.spacing.md },
  readOnlyLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  readOnlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: theme.sizes.inputHeight,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  readOnlyValue: { ...theme.textStyles.bodyMuted },
  readOnlyHint: { ...theme.textStyles.caption, marginTop: theme.spacing.xs },

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
});
