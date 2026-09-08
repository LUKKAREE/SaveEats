/**
 * แจ้งปัญหาให้ผู้ดูแลระบบ (ใช้ได้จริงแล้ว)
 *
 * เข้ามาได้จาก
 *   - หน้ารายละเอียดร้าน       -> ลูกค้าแจ้งปัญหาร้าน
 *   - หน้ารายละเอียดการจอง     -> แจ้งได้ทั้งลูกค้าและร้าน
 *   - หน้ารีวิวและคะแนนของร้าน -> ร้านแจ้งรีวิวที่ไม่เป็นธรรม
 *
 * *** ทำไมต้องมีหัวข้อสำเร็จรูปให้เลือก ***
 * ถ้าให้พิมพ์เองอย่างเดียว คนส่วนใหญ่จะพิมพ์สั้น ๆ ว่า "ไม่ดี" แล้วส่ง
 * ซึ่ง Admin เอาไปทำอะไรต่อไม่ได้เลย
 * หัวข้อสำเร็จรูปช่วยให้ได้ข้อมูลที่ใช้งานได้จริงโดยผู้ใช้ไม่ต้องคิดเยอะ
 *
 * API : POST /api/reports
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReportTargetType } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import AppButton from '../../../components/AppButton';
import FormSection from '../../../components/FormSection';
import ImagePickerField from '../../../components/ImagePickerField';

import reportService from '../reportService';
import { useAuth } from '../../../context/AuthContext';
import { errorMessage } from '../../../core/services/apiClient';
import type { PickedImage } from '../../../core/services/apiClient';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'Report'>;

/** ความยาวขั้นต่ำ ต้องตรงกับที่ Backend ตรวจ (reportValidator.ts) */
const MIN_REASON = 10;
const MAX_REASON = 500;

/**
 * หัวข้อสำเร็จรูป แยกตามประเภทของสิ่งที่แจ้ง
 *
 * ประกาศเป็น Record<ReportTargetType, ...> เพื่อบังคับให้ครบทุกประเภท
 * ถ้าเพิ่มประเภทใหม่ใน shared/src/enums.ts แล้วลืมมาเพิ่มที่นี่ TypeScript จะฟ้อง
 */
const PRESETS: Record<ReportTargetType, string[]> = {
  store: [
    'ไปถึงร้านแล้วแจ้งว่าของหมด ทั้งที่จองไว้',
    'ร้านปิดในเวลาที่ระบุว่าเปิด',
    'ที่อยู่หรือตำแหน่งบนแผนที่ไม่ตรงกับร้านจริง',
    'พนักงานพูดจาไม่สุภาพ',
  ],
  post: [
    'รูปอาหารไม่ตรงกับของจริง',
    'ราคาที่ลงไว้ไม่ตรงกับที่คิดจริง',
    'ปริมาณน้อยกว่าที่ระบุไว้มาก',
    'ข้อความในโพสต์ไม่เหมาะสม',
  ],
  reservation: [
    'ไปรับตามเวลาแล้วแต่ไม่ได้ของ',
    'ร้านยกเลิกการจองโดยไม่แจ้งล่วงหน้า',
    'อาหารที่ได้รับไม่ตรงกับที่จอง',
    'อาหารมีสภาพไม่เหมาะแก่การรับประทาน',
  ],
  review: [
    'รีวิวมีคำหยาบหรือถ้อยคำไม่เหมาะสม',
    'รีวิวเป็นการกลั่นแกล้ง ไม่ตรงกับความจริง',
    'รีวิวเป็นสแปมหรือโฆษณา',
  ],
  user: [
    'ผู้ใช้จองแล้วไม่มารับซ้ำ ๆ',
    'ผู้ใช้ใช้ถ้อยคำไม่เหมาะสม',
    'สงสัยว่าเป็นบัญชีปลอม',
  ],
};

/**
 * หัวข้อสำเร็จรูปเวอร์ชันฝั่งร้าน
 *
 * *** ทำไมต้องมีอีกชุด ***
 * หน้านี้ใช้ร่วมกันทั้งลูกค้าและร้าน แต่ "การจอง" หนึ่งใบมีสองมุมเสมอ
 * ลูกค้าเจอปัญหาแบบ "ไปถึงแล้วไม่ได้ของ" ส่วนร้านเจอแบบ "ลูกค้าไม่มารับ"
 * ถ้าใช้ชุดเดียวกัน ร้านจะเห็นหัวข้อที่กล่าวหาตัวเองอยู่เต็มไปหมด
 * แล้วสุดท้ายก็ต้องพิมพ์เองอยู่ดี หัวข้อสำเร็จรูปจึงไม่ได้ช่วยอะไรเลย
 *
 * ประเภทไหนไม่ได้ระบุไว้ที่นี่ ให้ใช้ชุดเดียวกับฝั่งลูกค้า
 */
const SELLER_PRESETS: Partial<Record<ReportTargetType, string[]>> = {
  reservation: [
    'ลูกค้าจองแล้วไม่มารับตามเวลา',
    'ลูกค้ามารับช้ากว่าเวลาที่กำหนดมาก',
    'ลูกค้าใช้ถ้อยคำไม่เหมาะสมกับพนักงาน',
    'สงสัยว่าเป็นการจองปลอมหรือกลั่นแกล้ง',
  ],
};

/** หัวเรื่องที่แสดงบนหน้าจอ ตามประเภทที่แจ้ง */
const TITLE: Record<ReportTargetType, string> = {
  store: 'แจ้งปัญหาเกี่ยวกับร้าน',
  post: 'แจ้งปัญหาเกี่ยวกับโพสต์',
  reservation: 'แจ้งปัญหาเกี่ยวกับการจอง',
  review: 'แจ้งปัญหาเกี่ยวกับรีวิว',
  user: 'แจ้งปัญหาเกี่ยวกับผู้ใช้',
};

export default function ReportScreen({ route, navigation }: Props): JSX.Element {
  const { targetType, targetId, targetName } = route.params;
  const { isSeller } = useAuth();

  const [reason, setReason] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ร้านเห็นหัวข้อชุดของร้าน ถ้าประเภทนั้นไม่ได้ทำชุดแยกไว้ ก็ใช้ชุดกลางเหมือนลูกค้า
  const presets = (isSeller ? SELLER_PRESETS[targetType] : undefined) ?? PRESETS[targetType];
  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_REASON;

  /** กดหัวข้อสำเร็จรูป = เอาไปใส่ในช่องพิมพ์ให้ ผู้ใช้แก้ต่อได้ */
  function usePreset(text: string): void {
    setReason(text);
    setError(null);
  }

  async function handleSubmit(): Promise<void> {
    if (trimmed.length < MIN_REASON) {
      setError(`กรุณาอธิบายปัญหาอย่างน้อย ${String(MIN_REASON)} ตัวอักษร`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await reportService.create({ targetType, targetId, reason: trimmed }, image);

      Alert.alert(
        'ส่งเรื่องแล้ว',
        'ผู้ดูแลระบบจะตรวจสอบและดำเนินการต่อ ขอบคุณที่ช่วยแจ้งเข้ามา',
        [{ text: 'ตกลง', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---- หัวเรื่อง ---- */}
        <View style={styles.headerCard}>
          <Ionicons name="flag-outline" size={22} color={theme.colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{TITLE[targetType]}</Text>
            {targetName !== undefined ? (
              <Text style={styles.headerTarget} numberOfLines={1}>
                {targetName}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ---- หัวข้อสำเร็จรูป ---- */}
        <FormSection title="เกิดอะไรขึ้น" hint="แตะหัวข้อที่ใกล้เคียงที่สุด แล้วแก้ข้อความเพิ่มได้">
          <View style={styles.presetWrap}>
            {presets.map((text) => {
              const active = reason === text;
              return (
                <TouchableOpacity
                  key={text}
                  style={[styles.preset, active ? styles.presetActive : null]}
                  onPress={() => usePreset(text)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={active ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text style={[styles.presetText, active ? styles.presetTextActive : null]}>
                    {text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormSection>

        {/* ---- รายละเอียด ---- */}
        <FormSection title="รายละเอียดเพิ่มเติม">
          <TextInput
            style={styles.textArea}
            placeholder="เล่าให้ละเอียดที่สุดเท่าที่จำได้ เช่น วันเวลาที่เกิดเรื่อง และสิ่งที่ร้านบอก"
            placeholderTextColor={theme.colors.textMuted}
            value={reason}
            onChangeText={(text) => {
              setReason(text.slice(0, MAX_REASON));
              setError(null);
            }}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.counterRow}>
            {tooShort ? (
              <Text style={styles.counterWarn}>
                อีก {MIN_REASON - trimmed.length} ตัวอักษรถึงจะส่งได้
              </Text>
            ) : (
              <View />
            )}
            <Text style={styles.counter}>
              {reason.length} / {MAX_REASON}
            </Text>
          </View>
        </FormSection>

        {/* ---- รูปหลักฐาน ---- */}
        <FormSection
          title="รูปหลักฐาน"
          hint="ไม่บังคับ แต่ช่วยให้ผู้ดูแลตัดสินได้เร็วขึ้นมาก โดยเฉพาะเรื่องสภาพอาหาร"
        >
          <ImagePickerField
            label=""
            value={image}
            onChange={setImage}
            hint="แตะเพื่อถ่ายรูปใหม่ หรือเลือกจากคลังภาพ"
          />
          {image !== null ? (
            <TouchableOpacity
              style={styles.removeImage}
              onPress={() => setImage(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle-outline" size={16} color={theme.colors.error} />
              <Text style={styles.removeImageText}>เอารูปออก</Text>
            </TouchableOpacity>
          ) : null}
        </FormSection>

        {error !== null ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ---- สิ่งที่ผู้ใช้ควรรู้ก่อนกดส่ง ---- */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.noticeText}>
            ผู้ดูแลระบบจะเห็นชื่อและอีเมลของคุณ เพื่อติดต่อกลับหากต้องการข้อมูลเพิ่ม
            {'\n'}แจ้งเรื่องเดิมซ้ำไม่ได้ระหว่างที่เรื่องเก่ายังตรวจสอบไม่เสร็จ
          </Text>
        </View>

        <AppButton
          title="ส่งเรื่องให้ผู้ดูแลระบบ"
          loading={saving}
          disabled={trimmed.length < MIN_REASON}
          onPress={() => { void handleSubmit(); }}
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

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerTitle: { ...theme.textStyles.subheading, color: theme.colors.error },
  headerTarget: { ...theme.textStyles.caption, color: theme.colors.error },

  presetWrap: { gap: theme.spacing.xs },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  presetActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  presetText: { ...theme.textStyles.body, flex: 1 },
  presetTextActive: { color: theme.colors.primaryDark },

  textArea: {
    ...theme.textStyles.body,
    minHeight: 120,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  counter: { ...theme.textStyles.caption },

  removeImage: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  removeImageText: { ...theme.textStyles.caption, color: theme.colors.error },
  counterWarn: { ...theme.textStyles.caption, color: theme.colors.warningText },

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

  noticeBox: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  noticeText: { ...theme.textStyles.caption, flex: 1, lineHeight: 20 },
});
