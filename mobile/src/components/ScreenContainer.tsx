/**
 * กรอบหน้าจอมาตรฐาน
 * ใช้ครอบทุกหน้าจอ เพื่อให้ระยะขอบและสีพื้นหลังเหมือนกันหมดทั้งแอป
 * และกันเนื้อหาไปทับรอยบากบนหน้าจอ iPhone
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { theme } from '../core/theme/theme';

interface ScreenContainerProps {
  children: ReactNode;
  /** true = เนื้อหาเลื่อนได้ */
  scroll?: boolean;
  /** false = ไม่ใส่ระยะขอบให้ (ใช้ตอนมี FlatList ที่จัดขอบเอง) */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
}

export default function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  style,
  edges = ['top'],
}: ScreenContainerProps): JSX.Element {
  const innerStyle = [padded ? styles.padded : null, style];

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={innerStyle}>{children}</View>
        </ScrollView>
      ) : (
        // *** ต้องมี flex: 1 ที่ View ชั้นนี้ ***
        // เดิมซ้อน View สองชั้น ชั้นในไม่มี flex ความสูงจึงเป็น auto
        // ลูกที่เขียน flex: 1 (เช่น KeyboardAvoidingView, FlatList) เลยยืดไม่ได้
        // กลายเป็นสูง 0 หน้าจอจึงว่างเปล่าทั้งที่โค้ดถูกต้อง
        <View style={[styles.flex, innerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  padded: { padding: theme.spacing.md },
  scrollContent: { flexGrow: 1, paddingBottom: theme.spacing.xl },
});
