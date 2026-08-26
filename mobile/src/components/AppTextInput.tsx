/**
 * ช่องกรอกข้อมูลมาตรฐาน
 *
 * หลัก UX ที่ใช้
 *   - มี label อยู่เหนือช่องเสมอ ไม่ใช้ placeholder แทน label
 *     (เพราะพอเริ่มพิมพ์แล้ว placeholder จะหายไป ผู้ใช้จะลืมว่าช่องนี้คืออะไร)
 *   - error แสดงใต้ช่อง พร้อมเปลี่ยนสีขอบเป็นแดง
 *   - ช่องรหัสผ่านมีปุ่มลูกตาให้กดดูรหัสได้
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../core/theme/theme';

interface AppTextInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** ข้อความ error ใต้ช่อง (null = ไม่มี error) */
  error?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  editable?: boolean;
  maxLength?: number;
  /** ชื่อไอคอนของ Ionicons เช่น 'mail-outline' */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  helperText?: string;
  style?: StyleProp<ViewStyle>;
}

export default function AppTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error = null,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  editable = true,
  maxLength,
  leftIcon,
  helperText,
  style,
}: AppTextInputProps): JSX.Element {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={[styles.wrapper, style]}>
      {label !== undefined ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputBox,
          multiline ? styles.multilineBox : null,
          error !== null ? styles.inputBoxError : null,
          !editable ? styles.inputBoxDisabled : null,
        ]}
      >
        {leftIcon !== undefined ? (
          <Ionicons
            name={leftIcon}
            size={theme.sizes.iconMd}
            color={theme.colors.textMuted}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          style={[styles.input, multiline ? styles.multilineInput : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          editable={editable}
          maxLength={maxLength}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setHidden(!hidden)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={theme.sizes.iconMd}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error !== null ? (
        <Text style={styles.error}>{error}</Text>
      ) : helperText !== undefined ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.spacing.md },
  label: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.sizes.inputHeight,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  multilineBox: { height: 110, alignItems: 'flex-start', paddingVertical: theme.spacing.sm },
  inputBoxError: { borderColor: theme.colors.error, backgroundColor: theme.colors.errorBg },
  inputBoxDisabled: { backgroundColor: theme.colors.surfaceAlt },
  leftIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, ...theme.textStyles.body, padding: 0 },
  multilineInput: { textAlignVertical: 'top', height: '100%' },
  error: { ...theme.textStyles.caption, color: theme.colors.error, marginTop: theme.spacing.xs },
  helper: { ...theme.textStyles.caption, marginTop: theme.spacing.xs },
});
