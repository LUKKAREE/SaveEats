/**
 * เมนูล่างของฝั่งร้านค้า
 *   หน้าหลัก / โพสต์ / สแกน QR / การจอง / โปรไฟล์
 *
 * หลัก UX : แท็บสแกน QR ทำให้เด่นเป็นวงกลมเขียวตรงกลาง
 * เพราะเป็นสิ่งที่ร้านต้องกดบ่อยที่สุดตอนลูกค้ามารับของ
 */
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SellerDashboardScreen from '../seller/dashboard/SellerDashboardScreen';
import SellerPostListScreen from '../seller/posts/SellerPostListScreen';
import ScanQrScreen from '../seller/reservations/ScanQrScreen';
import SellerReservationListScreen from '../seller/reservations/SellerReservationListScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';

import { theme } from '../core/theme/theme';
import type { SellerTabParamList } from './types';

/*
 * *** ระยะเผื่อแถบปุ่มของระบบด้านล่าง ***
 *
 * มือถือ Android แต่ละรุ่นมีแถบล่างไม่เหมือนกัน
 *   - แบบ 3 ปุ่ม (ย้อนกลับ / โฮม / ล่าสุด) กินพื้นที่ราว 48 dp
 *   - แบบปัดนิ้ว (gesture) กินแค่ราว 16 dp
 *   - iPhone รุ่นมีรอยบาก มีขีดล่างกินราว 34 dp
 *
 * ถ้าตั้งความสูงแท็บเป็นเลขตายตัว แท็บจะไปซ้อนกับแถบของระบบ
 * ผู้ใช้กดแท็บล่างสุดแล้วโดนปุ่มโฮมของเครื่องแทน ซึ่งน่ารำคาญมาก
 *
 * useSafeAreaInsets บอกได้ว่าเครื่องที่กำลังใช้อยู่กินพื้นที่ล่างไปเท่าไหร่จริง ๆ
 * เราเอาค่านั้นมาบวกเพิ่ม แท็บจึงลอยอยู่เหนือแถบระบบพอดีทุกรุ่น
 * (แอปใหญ่ ๆ อย่าง Facebook, Shopee ก็ใช้วิธีนี้เหมือนกัน)
 */
const Tab = createBottomTabNavigator<SellerTabParamList>();

export default function SellerTabs(): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          // ดูคำอธิบายเรื่อง insets ที่หัวไฟล์
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: theme.fonts.medium },
      }}
    >
      <Tab.Screen
        name="SellerDashboard"
        component={SellerDashboardScreen}
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SellerPosts"
        component={SellerPostListScreen}
        options={{
          title: 'โพสต์',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SellerScanQr"
        component={ScanQrScreen}
        options={{
          title: 'สแกน',
          tabBarIcon: () => (
            <View style={styles.scanButton}>
              <Ionicons name="qr-code" size={26} color={theme.colors.textOnPrimary} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SellerReservations"
        component={SellerReservationListScreen}
        options={{
          title: 'การจอง',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    ...theme.shadows.floating,
  },
});
