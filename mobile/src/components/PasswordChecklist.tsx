/**
 * รายการเงื่อนไขรหัสผ่าน ติ๊กถูกทันทีขณะพิมพ์
 *
 * *** ทำไมต้องโชว์เงื่อนไขไว้ตลอด ไม่ใช่รอฟ้องตอนกดปุ่ม ***
 * ถ้าบอกว่า "รหัสผ่านไม่ถูกต้อง" หลังกดสมัคร ผู้ใช้ต้องเดาเองว่าขาดอะไร
 * แล้วลองแก้ กดใหม่ โดนปฏิเสธอีก วนอยู่แบบนั้นจนหงุดหงิดแล้วเลิกสมัครไปเลย
 *
 * แสดงเงื่อนไขทุกข้อไว้ตั้งแต่แรก แล้วติ๊กถูกทีละข้อขณะพิมพ์
 * ผู้ใช้จะเห็นตลอดว่าเหลืออะไร และรู้ทันทีว่าครบเมื่อไหร่
 *
 * *** ใช้ทั้งไอคอนและสี ไม่ใช่สีอย่างเดียว ***
 * คนตาบอดสีเขียว-แดงแยกสีสองอันนี้ไม่ออก
 * วงกลมว่างกับเครื่องหมายถูกต่างกันชัดเจนโดยไม่ต้องพึ่งสี
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkPasswordRules, PASSWORD_RULE_LABELS } from '@shared/index';
import type { PasswordChecks } from '@shared/index';
import { theme } from '../core/theme/theme';

interface PasswordChecklistProps {
  /** รหัสผ่านที่ผู้ใช้กำลังพิมพ์ */
  value: string;
}

/** ลำดับการแสดงผล เรียงจากข้อที่คนมักลืมน้อยสุดไปมากสุด */
const ORDER: (keyof PasswordChecks)[] = ['length', 'lower', 'upper', 'digit', 'special'];

export default function PasswordChecklist({ value }: PasswordChecklistProps): JSX.Element {
  const checks = checkPasswordRules(value);
  const passed = ORDER.filter((key) => checks[key]).length;
  const allPassed = passed === ORDER.length;

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text style={styles.headerText}>เงื่อนไขรหัสผ่าน</Text>
        <Text style={[styles.counter, allPassed ? styles.counterDone : null]}>
          {passed}/{ORDER.length}
        </Text>
      </View>

      {ORDER.map((key) => {
        const done = checks[key];
        return (
          <View key={key} style={styles.row}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={done ? theme.colors.success : theme.colors.textMuted}
            />
            <Text style={[styles.label, done ? styles.labelDone : null]}>
              {PASSWORD_RULE_LABELS[key]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm + 2,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  headerText: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  counter: { ...theme.textStyles.caption, color: theme.colors.textMuted },
  counterDone: { color: theme.colors.success, fontFamily: theme.fonts.medium },

  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  label: { ...theme.textStyles.caption, color: theme.colors.textMuted, flex: 1 },
  labelDone: { color: theme.colors.textSecondary },
});
