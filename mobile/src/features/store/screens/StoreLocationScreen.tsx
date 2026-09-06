/**
 * ตำแหน่งร้านแบบเต็มจอ
 *
 * เปิดจากการ์ดแผนที่ในหน้ายืนยันการจองและหน้ารายละเอียดการจอง
 * หน้านี้ดูอย่างเดียว ย้ายหมุดไม่ได้ (คนละเรื่องกับ SellerPickLocation ที่ให้ร้านตั้งหมุดเอง)
 *
 * มี 2 ปุ่ม
 *   กลับไปที่ร้าน  - เลื่อนแผนที่กลับมาที่หมุด เผื่อผู้ใช้ปัดจนหลง
 *   นำทาง         - ส่งต่อให้แอปแผนที่ของเครื่องทำงาน
 *
 * *** ทำไมไม่ทำระบบนำทางเอง ***
 * การนำทางต้องใช้ข้อมูลถนน สภาพจราจร และเสียงบอกทาง ซึ่งเป็นงานคนละสเกล
 * ส่งพิกัดต่อให้ Google Maps ที่ผู้ใช้คุ้นเคยอยู่แล้วดีกว่าในทุกทาง
 * และเป็นวิธีที่แอปจริงอย่าง Grab หรือ Airbnb ใช้กันเป็นมาตรฐาน
 */
import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Platform } from 'react-native';
import OsmMap, { OsmMarker } from '../../../components/OsmMap';
import type { OsmMapHandle } from '../../../components/OsmMap';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../../core/theme/theme';
import type { AppStackParamList } from '../../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


type Props = NativeStackScreenProps<AppStackParamList, 'StoreLocation'>;

export default function StoreLocationScreen({ route }: Props): JSX.Element {
  const { storeName, address, latitude, longitude } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<OsmMapHandle>(null);

  const coordinate = { latitude, longitude };
  const region = { ...coordinate, latitudeDelta: 0.006, longitudeDelta: 0.006 };

  /** เลื่อนแผนที่กลับมาที่ร้าน (เผื่อผู้ใช้ปัดออกไปไกลจนหาหมุดไม่เจอ) */
  function recenter(): void {
    mapRef.current?.animateToRegion(region, 400);
  }

  /**
   * เปิดแอปแผนที่ของเครื่องเพื่อนำทาง
   *
   * Android ใช้ geo: ซึ่งเป็นรูปแบบกลาง เครื่องจะถามเองว่าจะเปิดด้วยแอปไหน
   * iOS ไม่รู้จัก geo: จึงต้องส่งเป็นลิงก์เว็บของ Google Maps แทน
   * ถ้าเปิดไม่ได้จริง ๆ ก็บอกพิกัดให้ผู้ใช้ไปค้นเองได้ ดีกว่าเงียบไปเฉย ๆ
   */
  async function openDirections(): Promise<void> {
    const label = encodeURIComponent(storeName);
    const url = Platform.OS === 'ios'
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;

    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (!canOpen) {
      Alert.alert('เปิดแอปแผนที่ไม่ได้', `พิกัดของร้านคือ ${latitude}, ${longitude}`);
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <View style={styles.flex}>
      <OsmMap
        ref={mapRef}
        style={styles.flex}
        initialRegion={region}
      >
        <OsmMarker coordinate={coordinate} title={storeName} />
      </OsmMap>

      {/* ---- ชื่อร้านลอยด้านบน ---- */}
      <View style={styles.nameCard}>
        <Ionicons name="storefront" size={18} color={theme.colors.primary} />
        <View style={styles.nameInfo}>
          <Text style={styles.name} numberOfLines={1}>{storeName}</Text>
          {address !== null && address !== undefined && address !== '' ? (
            <Text style={styles.address} numberOfLines={2}>{address}</Text>
          ) : null}
        </View>
      </View>

      {/* ---- ปุ่มกลับมาที่หมุด ---- */}
      <TouchableOpacity style={styles.recenter} onPress={recenter} activeOpacity={0.85}>
        <Ionicons name="locate" size={20} color={theme.colors.primaryDark} />
      </TouchableOpacity>

      {/* ---- ปุ่มนำทาง เผื่อระยะแถบปุ่มของเครื่องด้วย ---- */}
      <View style={[styles.bottomBar, { paddingBottom: theme.spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => { void openDirections(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={19} color={theme.colors.textOnPrimary} />
          <Text style={styles.navText}>นำทางไปร้านนี้</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  nameCard: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  nameInfo: { flex: 1 },
  name: { ...theme.textStyles.subheading },
  address: { ...theme.textStyles.caption, marginTop: 1 },

  recenter: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 110,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    height: theme.sizes.buttonHeight,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  navText: {
    ...theme.textStyles.body,
    color: theme.colors.textOnPrimary,
    fontFamily: theme.fonts.semiBold,
  },
});
