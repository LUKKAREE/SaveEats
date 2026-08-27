/**
 * เมนูล่างของฝั่งลูกค้า
 *
 * หลัก UX : ใช้ 5 แท็บ ไม่เกินนี้ เพราะเกิน 5 แท็บไอคอนจะเบียดกันจนกดพลาด
 *   หน้าแรก (Feed) / แผนที่ / การจอง / ร้านโปรด / ฉัน
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../features/feed/screens/HomeScreen';
import MapScreen from '../features/map/screens/MapScreen';
import ReservationHistoryScreen from '../features/reservation/screens/ReservationHistoryScreen';
import FavoriteStoresScreen from '../features/favorite/screens/FavoriteStoresScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';

import { theme } from '../core/theme/theme';
import { useBadges, badgeLabel } from '../context/BadgeContext';
import type { CustomerTabParamList } from './types';

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
const Tab = createBottomTabNavigator<CustomerTabParamList>();

/** ไอคอนของแต่ละแท็บ (แบบทึบตอนเลือก แบบเส้นตอนไม่ได้เลือก) */
const ICONS: Record<keyof CustomerTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Map: { active: 'map', inactive: 'map-outline' },
  ReservationHistory: { active: 'receipt', inactive: 'receipt-outline' },
  Favorites: { active: 'heart', inactive: 'heart-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function CustomerTabs(): JSX.Element {
  const insets = useSafeAreaInsets();
  const { pendingReservations } = useBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
        /*
         * หน้าตาของจุดแดงบนแท็บ
         * ต้องกำหนดเอง เพราะสีตั้งต้นของ React Navigation เป็นแดงคนละเฉดกับ theme ของแอป
         */
        tabBarBadgeStyle: {
          backgroundColor: theme.colors.error,
          color: theme.colors.textOnPrimary,
          fontSize: 10,
          fontFamily: theme.fonts.bold,
          minWidth: 18,
          height: 18,
          lineHeight: 18,
          borderRadius: 9,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const config = ICONS[route.name];
          return <Ionicons name={focused ? config.active : config.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'หน้าแรก' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'แผนที่' }} />
      <Tab.Screen
        name="ReservationHistory"
        component={ReservationHistoryScreen}
        options={{
          title: 'การจอง',
          /*
           * นับเฉพาะการจองที่ยัง "ต้องไปรับ"
           * ตัวเลขบนแท็บควรหมายถึงงานที่ผู้ใช้ยังต้องทำ ไม่ใช่จำนวนรายการทั้งหมด
           * ส่ง undefined เมื่อเป็น 0 เพื่อให้จุดแดงหายไปเลย (ถ้าส่ง 0 จะขึ้นวงกลมเลข 0 ค้างไว้)
           */
          tabBarBadge: pendingReservations > 0 ? badgeLabel(pendingReservations) : undefined,
          tabBarAccessibilityLabel:
            pendingReservations > 0
              ? `การจอง มี ${pendingReservations} รายการที่ต้องไปรับ`
              : 'การจอง',
        }}
      />
      <Tab.Screen name="Favorites" component={FavoriteStoresScreen} options={{ title: 'ร้านโปรด' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'ฉัน' }} />
    </Tab.Navigator>
  );
}
