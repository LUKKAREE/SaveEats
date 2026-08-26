/**
 * แถบปุ่มที่ตรึงอยู่ล่างจอ
 *
 * *** ทำไมต้องมีคอมโพเนนต์นี้ แทนที่จะเขียน View ธรรมดา ***
 *
 * Android แต่ละรุ่นมีแถบล่างของระบบไม่เท่ากัน
 *   - แบบ 3 ปุ่ม (ย้อนกลับ / โฮม / ล่าสุด)  กินราว 48 dp
 *   - แบบปัดนิ้ว (gesture)                  กินราว 16 dp
 *   - iPhone รุ่นมีรอยบาก มีขีดล่าง          กินราว 34 dp
 *
 * ถ้าเขียน paddingBottom เป็นเลขตายตัว ปุ่มจะไปนอนทับแถบของระบบ
 * ผู้ใช้กดปุ่มยืนยันแล้วโดนปุ่มโฮมของเครื่องแทน ซึ่งพลาดง่ายมาก
 *
 * ScreenContainer กันขอบให้เฉพาะด้านบน (edges={['top']}) เท่านั้น
 * เพราะหน้าที่มีลิสต์ยาว ๆ ต้องให้เนื้อหาไหลลงไปใต้แถบระบบได้ ถึงจะดูเต็มจอ
 * ด้านล่างจึงต้องมาเผื่อกันเองเฉพาะจุดที่มีของ "ตรึง" ไว้ ซึ่งก็คือแถบนี้
 *
 * useSafeAreaInsets บอกค่าที่เครื่องนั้น ๆ กินไปจริง ๆ เอามาบวกเข้ากับระยะขอบปกติ
 * แถบปุ่มจึงลอยอยู่เหนือแถบระบบพอดีทุกรุ่น โดยไม่ต้องไปเดาว่าเครื่องไหนเป็นแบบไหน
 */
import { View, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../core/theme/theme';

interface StickyFooterProps {
  children: ReactNode;
  /**
   * 'bar'   = มีพื้นหลังขาวและเส้นคั่นด้านบน (ใช้กับหน้าที่มีเนื้อหาเลื่อนอยู่ข้างหลัง)
   * 'plain' = โปร่งใส ไม่มีเส้นคั่น (ใช้กับหน้าที่พื้นหลังเป็นชิ้นเดียวกันอยู่แล้ว)
   */
  variant?: 'bar' | 'plain';
  style?: StyleProp<ViewStyle>;
}

export default function StickyFooter({
  children,
  variant = 'bar',
  style,
}: StickyFooterProps): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.base,
        variant === 'bar' ? styles.bar : null,
        // เผื่อความสูงแถบระบบของเครื่องนั้น ๆ เพิ่มจากระยะขอบปกติ
        { paddingBottom: theme.spacing.md + insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  bar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
