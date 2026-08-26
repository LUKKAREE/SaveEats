/**
 * เพิ่ม / แก้ไขเมนูในคลัง
 *
 * ถ้ามี route.params.foodId  = โหมดแก้ไข
 * ถ้าไม่มี                    = โหมดเพิ่มใหม่
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category, CreateFoodRequest } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import AppTextInput from '../../components/AppTextInput';
import AppButton from '../../components/AppButton';
import FormSection from '../../components/FormSection';
import ImagePickerField from '../../components/ImagePickerField';
import LoadingView from '../../components/LoadingView';

import foodService from '../services/foodService';
import { errorMessage } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import { imageUrl } from '../../core/constants/apiConstants';
import { validateForm, validatePrice } from '../../core/utils/validators';
import { theme } from '../../core/theme/theme';
import type { SellerScreenProps } from '../../navigation/types';

type Props = SellerScreenProps<'SellerFoodForm'>;
type FieldName = 'name' | 'normalPrice';

export default function SellerFoodFormScreen({ route, navigation }: Props): JSX.Element {
  const foodId = route.params?.foodId;
  const isEditMode = foodId !== undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [normalPrice, setNormalPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // โหลดหมวดหมู่ และถ้าเป็นโหมดแก้ไขก็โหลดข้อมูลเมนูเดิมมาใส่ในฟอร์ม
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const cats = await foodService.getCategories();
        if (active) setCategories(cats);

        if (isEditMode) {
          const food = await foodService.getById(foodId);
          if (!active) return;
          setName(food.name);
          setDescription(food.description ?? '');
          setNormalPrice(String(food.normal_price));
          setCategoryId(food.category_id);
          setCurrentImage(imageUrl(food.image, 'food'));
        }
      } catch (err) {
        if (active) setServerError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [foodId, isEditMode]);

  // ตั้งชื่อหัวข้อด้านบนให้ตรงกับโหมด
  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่' });
  }, [navigation, isEditMode]);

  async function handleSave(): Promise<void> {
    setServerError(null);

    const { isValid, errors: formErrors } = validateForm<FieldName>({
      name: () => (name.trim() === '' ? 'กรุณากรอกชื่อเมนู' : null),
      normalPrice: () => validatePrice(normalPrice),
    });
    setErrors(formErrors);
    if (!isValid) return;

    const body: CreateFoodRequest = {
      name: name.trim(),
      normalPrice: Number(normalPrice),
      ...(description.trim() !== '' ? { description: description.trim() } : {}),
      ...(categoryId !== null ? { categoryId } : {}),
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await foodService.update(foodId, body, image);
      } else {
        await foodService.create(body, image);
      }
      navigation.goBack();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingView message="กำลังโหลดข้อมูล..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {serverError !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          <FormSection title="ข้อมูลเมนู">
            <AppTextInput
              label="ชื่อเมนู"
              value={name}
              onChangeText={setName}
              placeholder="เช่น ข้าวกะเพราหมูสับไข่ดาว"
              autoCapitalize="sentences"
              error={errors.name ?? null}
              maxLength={150}
            />

            <AppTextInput
              label="ราคาปกติ (บาท)"
              value={normalPrice}
              onChangeText={setNormalPrice}
              placeholder="60"
              keyboardType="numeric"
              error={errors.normalPrice ?? null}
              helperText="ราคาเต็มก่อนลด จะแสดงเป็นราคาขีดฆ่าให้ลูกค้าเห็นความคุ้ม"
            />

            <AppTextInput
              label="รายละเอียด (ไม่บังคับ)"
              value={description}
              onChangeText={setDescription}
              placeholder="เช่น เผ็ดกลาง ใส่ไข่ดาวกรอบ"
              multiline
              autoCapitalize="sentences"
            />
          </FormSection>

          <FormSection title="หมวดหมู่" hint="ช่วยให้ลูกค้ากรองหาเจอง่ายขึ้น">
            <View style={styles.chipRow}>
              {categories.map((cat) => {
                const active = categoryId === cat.category_id;
                return (
                  <TouchableOpacity
                    key={cat.category_id}
                    style={[styles.chip, active ? styles.chipActive : null]}
                    onPress={() => setCategoryId(active ? null : cat.category_id)}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormSection>

          <FormSection title="รูปเมนู">
            <ImagePickerField
              label=""
              value={image}
              onChange={setImage}
              currentImageUrl={currentImage}
              hint="ไม่ใส่ก็ได้ แต่โพสต์ที่มีรูปคนกดดูมากกว่าเยอะ"
            />
          </FormSection>

          <AppButton
            title={isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มเมนูเข้าคลัง'}
            onPress={() => { void handleSave(); }}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.textStyles.bodyMuted, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },
});
