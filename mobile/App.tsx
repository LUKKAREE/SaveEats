/**
 * จุดเริ่มต้นของแอป SaveEats
 *
 * ลำดับการทำงาน
 *   1. โหลดฟอนต์ Prompt จากแพ็กเกจ (ถ้าโหลดไม่ได้ จะใช้ฟอนต์ระบบแทน)
 *   2. ครอบด้วย SafeAreaProvider (กันรอยบากบนหน้าจอ)
 *   3. ครอบด้วย AuthProvider (เก็บสถานะการ Login)
 *   4. เรียก RootNavigator ให้ตัดสินใจว่าจะแสดงหน้าไหน
 */
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  useFonts,
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_600SemiBold,
  Prompt_700Bold,
} from '@expo-google-fonts/prompt';

import { AuthProvider } from './src/context/AuthContext';
import { FilterProvider } from './src/context/FilterContext';
import RootNavigator from './src/navigation/RootNavigator';
import LoadingView from './src/components/LoadingView';
import { theme } from './src/core/theme/theme';

export default function App(): JSX.Element {
  /**
   * โหลดฟอนต์ Prompt จากแพ็กเกจ @expo-google-fonts/prompt
   *
   * *** ทำไมถึงเปลี่ยนมาใช้แพ็กเกจแทนไฟล์ .ttf ***
   * เดิมเขียน require('./assets/fonts/Prompt-Regular.ttf') ซึ่งเป็นไฟล์ที่ยังไม่มีจริง
   * Metro (ตัวรวมโค้ดของ Expo) ตรวจ require ตั้งแต่ตอนรวมโค้ด ไม่ใช่ตอนรัน
   * ต่อให้ครอบ try/catch ไว้ก็ไม่ช่วย เพราะพังก่อนที่โค้ดจะได้ทำงาน
   *
   * ใช้แพ็กเกจแทน ฟอนต์ติดมาในตัวเลย เพื่อนในทีมแค่ npm install ก็ได้ฟอนต์ครบ
   *
   * useFonts คืนค่า [โหลดเสร็จหรือยัง, error]
   * ถ้าโหลดไม่สำเร็จเราก็ยังให้แอปเดินต่อ โดยใช้ฟอนต์ของระบบแทน
   */
  const [fontsLoaded, fontError] = useFonts({
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_600SemiBold,
    Prompt_700Bold,
  });

  const fontsReady = fontsLoaded || fontError !== null;

  if (!fontsReady) {
    return (
      <View style={styles.loading}>
        <LoadingView message="กำลังเตรียมแอป..." />
      </View>
    );
  }

  /*
   * *** initialWindowMetrics คืออะไร ทำไมต้องใส่ ***
   *
   * SafeAreaProvider ต้องรู้ว่าขอบจอกินพื้นที่ไปเท่าไหร่ (รอยบากบน / แถบปุ่มล่าง)
   * ปกติมันจะวัดเองตอนรันจริง ซึ่งใช้เวลา 1 เฟรม
   *
   * ปัญหาคือในเฟรมแรกนั้นทุกอย่างได้ค่าขอบเป็น 0 ไปก่อน
   * แถบแท็บล่างที่คำนวณจาก 62 + insets.bottom จึงสูงแค่ 62 ในเฟรมแรก
   * พอเฟรมถัดมาค่าจริงมาถึง (แถบ 3 ปุ่มของ Android กินราว 48 dp)
   * ความสูงกระโดดขึ้นทันที เนื้อหาทั้งหน้าจึงถูกบีบและดูเหมือนจอ "ยืด" หนึ่งแวบ
   *
   * initialWindowMetrics คือค่าที่ระบบวัดไว้ให้ตั้งแต่ตอนแอปเริ่ม
   * (มาจากฝั่ง native ไม่ต้องรอ JavaScript วัด) ใส่เข้าไปแล้วเฟรมแรกก็ได้ค่าจริงเลย
   */
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <FilterProvider>
          <StatusBar style="dark" backgroundColor={theme.colors.background} />
          <RootNavigator />
        </FilterProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: theme.colors.background },
});
