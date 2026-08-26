/**
 * ช่องเลือกรูปภาพ
 *
 * แสดงรูปที่เลือกไว้ หรือรูปเดิมจาก server ถ้ามี
 * กดแล้วให้เลือกว่าจะถ่ายใหม่หรือเลือกจากคลัง
 */
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../core/theme/theme';
import imagePicker from '../core/services/imagePicker';
import type { PickedImage } from '../core/services/apiClient';
import type { PickOptions } from '../core/services/imagePicker';

interface ImagePickerFieldProps {
  label?: string;
  /** รูปที่ผู้ใช้เพิ่งเลือก (ยังไม่ได้อัปโหลด) */
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
  /** URL รูปเดิมที่อยู่บน server (ใช้ตอนแก้ไข) */
  currentImageUrl?: string | null;
  hint?: string;
  /**
   * ล็อกสัดส่วนกรอบครอบตัด เช่น [1, 1] = สี่เหลี่ยมจัตุรัส
   * ไม่ส่งมา = ลากกรอบได้อิสระ ซึ่งเป็นค่าที่เหมาะกับรูปอาหารและรูปร้าน
   */
  aspect?: PickOptions['aspect'];
}

export default function ImagePickerField({
  label = 'รูปภาพ',
  value,
  onChange,
  currentImageUrl = null,
  hint,
  aspect,
}: ImagePickerFieldProps): JSX.Element {
  const previewUri = value?.uri ?? currentImageUrl;

  async function handlePick(): Promise<void> {
    const picked = await imagePicker.choose({ aspect });
    if (picked !== null) onChange(picked);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity style={styles.box} onPress={() => { void handlePick(); }} activeOpacity={0.8}>
        {previewUri !== null ? (
          <>
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
            <View style={styles.overlay}>
              <Ionicons name="camera" size={20} color={theme.colors.textOnPrimary} />
              <Text style={styles.overlayText}>เปลี่ยนรูป</Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="image-outline" size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>แตะเพื่อเลือกรูป</Text>
          </View>
        )}
      </TouchableOpacity>

      {value !== null ? (
        <TouchableOpacity onPress={() => onChange(null)} style={styles.clear}>
          <Text style={styles.clearText}>ลบรูปที่เลือก</Text>
        </TouchableOpacity>
      ) : null}

      {hint !== undefined ? <Text style={styles.hint}>{hint}</Text> : null}
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
  box: {
    height: 160,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    right: theme.spacing.sm,
    bottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  overlayText: {
    ...theme.textStyles.caption,
    color: theme.colors.textOnPrimary,
    marginLeft: 4,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...theme.textStyles.caption, marginTop: theme.spacing.xs },
  clear: { alignSelf: 'flex-start', marginTop: theme.spacing.xs },
  clearText: { ...theme.textStyles.caption, color: theme.colors.error },
  hint: { ...theme.textStyles.caption, marginTop: theme.spacing.xs },
});
