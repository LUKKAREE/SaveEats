/**
 * หน้าโปรไฟล์ (ใช้ได้จริงแล้ว)
 *
 * ทำงานได้แล้ว : แสดงข้อมูลผู้ใช้ สถานะร้าน เมนูลัด และปุ่มออกจากระบบ
 *
 * หน้านี้ถูกใช้ทั้งฝั่งลูกค้าและฝั่งร้าน โดยดูจาก isSeller ว่าจะโชว์เมนูชุดไหน
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenContainer from '../../../components/ScreenContainer';
import AppButton from '../../../components/AppButton';
import StatusBadge from '../../../components/StatusBadge';
import { imageUrl } from '../../../core/constants/apiConstants';
import { theme } from '../../../core/theme/theme';
import { useAuth } from '../../../context/AuthContext';
import type { AppStackParamList } from '../../../navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

/**
 * เมนู 1 แถว
 *
 * ใช้ onPress เป็นฟังก์ชันแทนการเก็บชื่อหน้าเป็น string
 * เพราะบางเมนูต้องกระโดดเข้าแท็บ (ต้องส่ง { screen: ... } ด้วย)
 * ถ้าเก็บเป็น string จะเขียนชนิดให้ถูกทุกกรณีไม่ได้
 *
 * onPress = null แปลว่าเมนูนั้นยังไม่ได้ทำ (กดแล้วไม่มีอะไรเกิดขึ้น)
 */
interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: (() => void) | null;
}

export default function ProfileScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { user, store, isSeller, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * รูปที่จะใช้เป็นไอคอนโปรไฟล์
   *
   * *** ฝั่งร้านค้าใช้รูปหน้าร้านแทนได้ ***
   * ร้านส่วนใหญ่อัปโหลดรูปร้านไว้แล้ว แต่ไม่เคยไปตั้งรูปโปรไฟล์ส่วนตัว
   * ถ้าไม่เผื่อไว้ ร้านจะเห็นเป็นไอคอนเปล่า ๆ ทั้งที่ใส่รูปไปแล้ว แล้วนึกว่าระบบพัง
   * ลำดับคือ รูปส่วนตัวมาก่อน ถ้าไม่มีค่อยใช้รูปร้าน ถ้าไม่มีอีกค่อยเป็นไอคอน
   */
  const avatarUri =
    imageUrl(user?.avatar ?? null, 'profile')
    ?? (isSeller ? imageUrl(store?.image ?? null, 'store') : null);

  function confirmLogout(): void {
    Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setLoggingOut(true);
            await logout();
            setLoggingOut(false);
          })();
        },
      },
    ]);
  }

  const menuItems: MenuItem[] = isSeller
    ? [
        {
          icon: 'create-outline',
          label: 'แก้ไขข้อมูลส่วนตัว',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'storefront-outline',
          label: 'ข้อมูลร้าน',
          onPress: () => navigation.navigate('SellerStore'),
        },
        {
          icon: 'fast-food-outline',
          label: 'คลังเมนูอาหาร',
          onPress: () => navigation.navigate('SellerFoods'),
        },
        {
          icon: 'star-outline',
          label: 'รีวิวและคะแนน',
          onPress: () => navigation.navigate('SellerReviews'),
        },
        {
          icon: 'flag-outline',
          label: 'เรื่องที่ฉันแจ้ง',
          onPress: () => navigation.navigate('MyReports'),
        },
        {
          icon: 'key-outline',
          label: 'เปลี่ยนรหัสผ่าน',
          onPress: () => navigation.navigate('ChangePassword'),
        },
      ]
    : [
        {
          icon: 'create-outline',
          label: 'แก้ไขข้อมูลส่วนตัว',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'receipt-outline',
          label: 'การจองของฉัน',
          // ประวัติการจองเป็นแท็บ ไม่ใช่หน้าใน stack จึงต้องระบุ screen ซ้อนเข้าไป
          onPress: () => navigation.navigate('CustomerTabs', { screen: 'ReservationHistory' }),
        },
        {
          icon: 'star-outline',
          label: 'รีวิวของฉัน',
          onPress: () => navigation.navigate('MyReviews'),
        },
        {
          icon: 'flag-outline',
          label: 'เรื่องที่ฉันแจ้ง',
          onPress: () => navigation.navigate('MyReports'),
        },
        {
          icon: 'key-outline',
          label: 'เปลี่ยนรหัสผ่าน',
          onPress: () => navigation.navigate('ChangePassword'),
        },
      ];

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---- การ์ดข้อมูลผู้ใช้ ---- */}
        <View style={styles.profileCard}>
          {/*
            รูปโปรไฟล์ที่ผู้ใช้อัปโหลดไว้
            ถ้ายังไม่เคยอัปโหลด (avatar เป็น null) จึงค่อยใช้ไอคอนแทน
          */}
          <View style={styles.avatar}>
            {avatarUri !== null ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons
                name={isSeller ? 'storefront' : 'person'}
                size={32}
                color={theme.colors.textOnPrimary}
              />
            )}
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone !== null && user?.phone !== undefined ? (
            <Text style={styles.email}>{user.phone}</Text>
          ) : null}

          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{isSeller ? 'บัญชีร้านค้า' : 'บัญชีลูกค้า'}</Text>
          </View>
        </View>

        {/* ---- สถานะร้าน (เฉพาะ seller) ---- */}
        {isSeller && store !== null ? (
          <View style={styles.storeCard}>
            <View style={styles.storeRow}>
              <Text style={styles.storeName}>{store.store_name}</Text>
              <StatusBadge status={store.status} type="store" />
            </View>
            {store.status === 'pending' ? (
              <Text style={styles.storeNote}>
                ร้านของคุณกำลังรอผู้ดูแลระบบตรวจสอบ ระหว่างนี้ยังลงขายไม่ได้
              </Text>
            ) : null}
            {store.status === 'rejected' && store.reject_reason !== null ? (
              <Text style={styles.storeNote}>เหตุผล: {store.reject_reason}</Text>
            ) : null}
          </View>
        ) : null}

        {/* ---- เมนู ---- */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, index < menuItems.length - 1 ? styles.menuItemBorder : null]}
              onPress={item.onPress ?? undefined}
              disabled={item.onPress === null}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.onPress !== null ? (
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              ) : (
                <Text style={styles.soon}>เร็ว ๆ นี้</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <AppButton
          title="ออกจากระบบ"
          variant="outline"
          loading={loggingOut}
          onPress={confirmLogout}
          style={styles.logout}
        />

        <Text style={styles.version}>SaveEats เวอร์ชัน 1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    // ต้องมี overflow: hidden ไม่งั้นรูปสี่เหลี่ยมจะล้นออกนอกวงกลม
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  name: { ...theme.textStyles.heading },
  email: { ...theme.textStyles.bodyMuted },
  rolePill: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  roleText: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.medium,
  },

  storeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    ...theme.shadows.card,
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storeName: { ...theme.textStyles.subheading, flex: 1 },
  storeNote: { ...theme.textStyles.caption, marginTop: theme.spacing.xs },

  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginTop: theme.spacing.md,
    ...theme.shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuLabel: { ...theme.textStyles.body, flex: 1, marginLeft: theme.spacing.md },
  soon: { ...theme.textStyles.caption },

  logout: { marginTop: theme.spacing.lg },
  version: {
    ...theme.textStyles.caption,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
