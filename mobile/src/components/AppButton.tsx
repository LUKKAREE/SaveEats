/**
 * ปุ่มมาตรฐานของ SaveEats
 *
 * มี 4 แบบ
 *   primary   ปุ่มหลัก พื้นเขียว        (ใช้กับการกระทำหลัก 1 ปุ่มต่อหน้าจอ)
 *   secondary ปุ่มรอง พื้นส้ม           (ใช้กับการจอง เพราะต้องสะดุดตา)
 *   outline   ปุ่มขอบ พื้นขาว
 *   ghost     ปุ่มโปร่ง ไม่มีขอบ
 *
 * หลัก UX ที่ใช้
 *   - สูง 48 เพราะนิ้วโป้งคนแตะแม่นที่ขนาดประมาณนี้
 *   - ตอนกำลังโหลดจะแสดงวงกลมหมุนและกดซ้ำไม่ได้ (กันกดจองซ้ำ)
 */
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { theme } from '../core/theme/theme';

/** แบบของปุ่มที่มีให้เลือก (พิมพ์ชื่ออื่นจะขึ้น error ทันที) */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: theme.colors.textOnPrimary,
  secondary: theme.colors.textOnPrimary,
  outline: theme.colors.primary,
  ghost: theme.colors.primary,
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon = null,
  fullWidth = true,
  style,
}: AppButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  const textColor = TEXT_COLOR[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.base,
        styles[variant],
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[theme.textStyles.button, { color: textColor }, icon ? styles.textWithIcon : null]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: theme.sizes.buttonHeight,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  textWithIcon: { marginLeft: theme.spacing.sm },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.accent },
  outline: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
});
