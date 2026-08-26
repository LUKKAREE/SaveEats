/**
 * ตัวกรอง Feed (ใช้ได้จริงแล้ว)
 *
 * เปิดเป็น modal จากปุ่มข้าง ๆ ช่องค้นหาในหน้าแรก
 *
 * *** ค่าที่แก้ที่นี่ไม่ได้มีผลทันที ***
 * เก็บไว้ใน state ของหน้านี้ก่อน แล้วค่อยเขียนลง Context ตอนกด "ใช้ตัวกรอง"
 * เพื่อให้ผู้ใช้กดเปลี่ยนไปมาได้โดย Feed ไม่กระพริบตามทุกครั้งที่แตะ
 * และกด "ปิด" เพื่อยกเลิกได้โดยของเดิมไม่เปลี่ยน
 *
 * หลัก UX : ปุ่ม "ล้างทั้งหมด" ต้องหาเจอง่าย ผู้ใช้มักกรองแล้วลืมว่ากรองอะไรไว้
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category, FeedSort } from '@shared/index';
import { FEED_SORT_OPTIONS } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import AppButton from '../../../components/AppButton';
import StickyFooter from '../../../components/StickyFooter';
import FormSection from '../../../components/FormSection';

import feedService from '../../feed/feedService';
import { useFilter, DEFAULT_FILTERS } from '../../../context/FilterContext';
import type { FeedFilters } from '../../../context/FilterContext';
import { RADIUS } from '../../../core/constants/appConstants';
import { formatPrice } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'Filter'>;

/** ช่วงราคาสำเร็จรูป ตั้งจากราคาอาหารข้างทางทั่วไป */
const PRICE_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'ไม่จำกัด' },
  { value: 30, label: 'ไม่เกิน 30' },
  { value: 50, label: 'ไม่เกิน 50' },
  { value: 80, label: 'ไม่เกิน 80' },
  { value: 120, label: 'ไม่เกิน 120' },
];

export default function FilterScreen({ navigation }: Props): JSX.Element {
  const { filters, setFilters, resetFilters } = useFilter();

  // ทำสำเนามาแก้ ยังไม่แตะของจริงจนกว่าจะกดใช้
  const [draft, setDraft] = useState<FeedFilters>(filters);
  const [categories, setCategories] = useState<Category[]>([]);

  // โหลดหมวดหมู่ครั้งเดียวตอนเปิดหน้า ถ้าโหลดไม่ได้ก็แค่ไม่โชว์แถวหมวดหมู่
  useEffect(() => {
    void feedService
      .getCategories()
      .then(setCategories)
      .catch(() => { setCategories([]); });
  }, []);

  function patch(next: Partial<FeedFilters>): void {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function handleApply(): void {
    setFilters(draft);
    navigation.goBack();
  }

  function handleReset(): void {
    resetFilters();
    setDraft(DEFAULT_FILTERS);
    navigation.goBack();
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---- หมวดหมู่ ---- */}
        <FormSection title="หมวดหมู่">
          <View style={styles.chipWrap}>
            <Chip
              label="ทุกหมวด"
              active={draft.categoryId === null}
              onPress={() => patch({ categoryId: null })}
            />
            {categories.map((c) => (
              <Chip
                key={c.category_id}
                label={c.name}
                active={draft.categoryId === c.category_id}
                onPress={() => patch({ categoryId: c.category_id })}
              />
            ))}
          </View>
        </FormSection>

        {/* ---- ราคาสูงสุด ---- */}
        <FormSection title="ราคาสูงสุด" hint="ราคาหลังลดแล้ว">
          <View style={styles.chipWrap}>
            {PRICE_OPTIONS.map((opt) => (
              <Chip
                key={String(opt.value)}
                label={opt.label}
                active={draft.maxPrice === opt.value}
                onPress={() => patch({ maxPrice: opt.value })}
              />
            ))}
          </View>
        </FormSection>

        {/* ---- เรียงลำดับ ---- */}
        <FormSection title="เรียงลำดับ">
          <View style={styles.chipWrap}>
            {FEED_SORT_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={draft.sort === opt.value}
                onPress={() => patch({ sort: opt.value as FeedSort })}
              />
            ))}
          </View>
        </FormSection>

        {/* ---- ระยะทาง ---- */}
        <FormSection
          title="ระยะทาง"
          hint="ปิดไว้ = เห็นโพสต์จากทุกร้าน · เปิด = เห็นเฉพาะร้านที่อยู่ในรัศมีที่เลือก"
        >
          {/* สวิตช์เปิด/ปิดการกรองระยะทาง */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Ionicons name="navigate-outline" size={18} color={theme.colors.primaryDark} />
              <Text style={styles.switchLabel}>เฉพาะร้านใกล้ฉัน</Text>
            </View>
            <Switch
              value={draft.nearbyOnly}
              onValueChange={(on) => patch({ nearbyOnly: on })}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={draft.nearbyOnly ? theme.colors.primary : theme.colors.surface}
            />
          </View>

          {/* ให้เลือกรัศมีได้ต่อเมื่อเปิดสวิตช์แล้ว จะได้ไม่งงว่ากดไปแล้วทำไมไม่เห็นผล */}
          {draft.nearbyOnly ? (
            <>
              <View style={styles.chipWrap}>
                {RADIUS.OPTIONS.map((km) => (
                  <Chip
                    key={km}
                    label={`${km} กม.`}
                    active={draft.radiusKm === km}
                    onPress={() => patch({ radiusKm: km })}
                  />
                ))}
              </View>
              <Text style={styles.radiusNote}>
                ต้องอนุญาตให้แอปเข้าถึงตำแหน่งก่อน ถ้าไม่อนุญาตจะไม่กรองระยะทางให้
              </Text>
            </>
          ) : null}
        </FormSection>

        {/* ---- สรุปสิ่งที่เลือก ---- */}
        <View style={styles.summary}>
          <Ionicons name="funnel-outline" size={18} color={theme.colors.primaryDark} />
          <Text style={styles.summaryText}>
            {draft.maxPrice === null ? 'ทุกราคา' : `ไม่เกิน ${formatPrice(draft.maxPrice)}`}
            {' · '}
            {FEED_SORT_OPTIONS.find((o) => o.value === draft.sort)?.label ?? ''}
            {' · '}
            {draft.nearbyOnly ? `ในรัศมี ${draft.radiusKm} กม.` : 'ทุกระยะทาง'}
          </Text>
        </View>
      </ScrollView>

      {/* ---- ปุ่มล่าง อยู่ติดขอบเสมอ กดง่ายด้วยนิ้วโป้ง ----
          StickyFooter เผื่อความสูงแถบปุ่มของระบบให้เอง ปุ่มจะได้ไม่ไปทับปุ่มโฮม */}
      <StickyFooter style={styles.footerRow}>
        <AppButton title="ล้างทั้งหมด" variant="ghost" onPress={handleReset} style={{ flex: 1 }} />
        <AppButton title="ใช้ตัวกรอง" onPress={handleApply} style={{ flex: 2 }} />
      </StickyFooter>
    </ScreenContainer>
  );
}

/** ปุ่มตัวเลือกแบบกลม ๆ ใช้ซ้ำทุกหมวดในหน้านี้ */
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  switchLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  switchLabel: { ...theme.textStyles.body },
  radiusNote: { ...theme.textStyles.caption, marginTop: theme.spacing.sm },

  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.textStyles.body, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  summaryText: { ...theme.textStyles.caption, color: theme.colors.primaryDark, flex: 1 },

  /* StickyFooter จัดพื้นหลังกับเส้นคั่นให้แล้ว เหลือแค่บอกว่าปุ่มเรียงแนวนอน */
  footerRow: { flexDirection: 'row', gap: theme.spacing.sm },
});
