/**
 * เลือกตำแหน่งร้านบนแผนที่
 *
 * *** ทำไมต้องมีหน้านี้ ทั้งที่มีปุ่ม "ใช้ตำแหน่งปัจจุบัน" อยู่แล้ว ***
 * ปุ่มนั้นใช้ได้เฉพาะตอนที่เจ้าของร้านยืนอยู่ที่ร้านพอดี ซึ่งแทบไม่เคยเกิดขึ้นจริง
 * คนส่วนใหญ่สมัครตอนกลางคืนที่บ้าน หลังปิดร้านแล้ว
 *
 * ยิ่งกว่านั้น GPS ในอาคารคลาดเคลื่อนได้ 50-100 เมตร
 * ยืนอยู่ที่ร้านจริงแต่หมุดอาจไปตกร้านข้าง ๆ แล้วแก้ไม่ได้เลย
 * นอกจากจะเดินทางกลับไปที่ร้านเพื่อกดปุ่มใหม่
 *
 * หน้านี้แก้ทั้งสองปัญหา : ปักหมุดจากที่ไหนก็ได้ และขยับแก้ได้ตลอด
 *
 * *** หมุดอยู่กับที่ตรงกลางจอ แล้วให้เลื่อนแผนที่แทน ***
 * ไม่ได้ทำเป็นหมุดที่ลากได้ เพราะเวลาลาก นิ้วจะบังหมุดจนมองไม่เห็น
 * ว่ากำลังวางตรงไหน ต้องยกนิ้วขึ้นดูแล้วลากใหม่ซ้ำ ๆ
 * วิธีนี้นิ้วอยู่ห่างจากหมุดเสมอ เล็งได้แม่นกว่ามาก
 * (Grab, LINE MAN, Foodpanda ใช้แพทเทิร์นนี้กันหมด)
 */
import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '../../components/AppButton';
import locationService from '../../core/services/locationService';
import { theme } from '../../core/theme/theme';
import type { SellerScreenProps } from '../../navigation/types';

type Props = SellerScreenProps<'SellerPickLocation'>;

/** จุดกึ่งกลางกรุงเทพฯ ใช้ตอนยังไม่รู้ตำแหน่งอะไรเลย */
const FALLBACK = { latitude: 13.7563, longitude: 100.5018 };

/**
 * ระยะซูม
 *
 * ค่ายิ่งน้อยยิ่งซูมเข้า 0.004 ประมาณระดับ "เห็นตึกแต่ละหลัง"
 * ซึ่งเป็นระดับที่จำเป็นสำหรับการเล็งหน้าร้าน
 * ถ้าซูมออกกว่านี้จะปักได้แค่คร่าว ๆ ระดับถนน
 */
const ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

export default function PickLocationScreen({ route, navigation }: Props): JSX.Element {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const initial = route.params?.initial ?? null;

  /*
   * ตำแหน่งที่หมุดชี้อยู่ตอนนี้
   *
   * *** เก็บใน ref ไม่ใช่ state ***
   * ค่านี้เปลี่ยนทุกเฟรมขณะผู้ใช้เลื่อนแผนที่ ถ้าเก็บใน state
   * React จะ re-render ทั้งหน้าเป็นร้อยครั้งต่อวินาที แผนที่จะกระตุกหนัก
   * เราต้องการค่านี้แค่ตอนกดปุ่มยืนยันเท่านั้น จึงไม่จำเป็นต้อง render ใหม่
   */
  const pickedRef = useRef({
    latitude: initial?.latitude ?? FALLBACK.latitude,
    longitude: initial?.longitude ?? FALLBACK.longitude,
  });

  // อันนี้เก็บเป็น state เพราะต้องเอาไปแสดงเป็นตัวเลขให้ผู้ใช้เห็น
  const [display, setDisplay] = useState(pickedRef.current);
  const [locating, setLocating] = useState(false);

  const initialRegion: Region = {
    latitude: pickedRef.current.latitude,
    longitude: pickedRef.current.longitude,
    ...ZOOM,
  };

  /** เรียกตอนผู้ใช้เลื่อนแผนที่เสร็จ (ยกนิ้วแล้ว) */
  function handleRegionChangeComplete(region: Region): void {
    pickedRef.current = { latitude: region.latitude, longitude: region.longitude };
    setDisplay(pickedRef.current);
  }

  /** กระโดดไปตำแหน่งปัจจุบันของผู้ใช้ */
  async function goToCurrentLocation(): Promise<void> {
    setLocating(true);
    const coords = await locationService.getCurrentPosition().catch(() => null);
    setLocating(false);

    if (coords === null) return;

    // ขยับกล้องแบบมีอนิเมชัน ผู้ใช้จะเห็นว่าแผนที่พาไปที่ไหน ไม่ใช่วาร์ปไปเฉย ๆ
    mapRef.current?.animateToRegion(
      { latitude: coords.latitude, longitude: coords.longitude, ...ZOOM },
      600
    );
  }

  /**
   * ยืนยันตำแหน่ง แล้วส่งค่ากลับไปหน้าแก้ไขข้อมูลร้าน
   *
   * *** ใช้ navigate ไม่ใช่ goBack ***
   * goBack ส่งค่ากลับไม่ได้ ส่วน navigate ไปหน้าที่ยังอยู่ใน stack
   * จะเป็นการย้อนกลับไปหน้านั้นพร้อมส่ง params ให้ด้วย
   * หน้าปลายทางไม่ถูกสร้างใหม่ ข้อมูลที่กรอกค้างไว้จึงไม่หาย
   */
  function confirm(): void {
    navigation.navigate('SellerEditStore', {
      pickedLocation: {
        latitude: pickedRef.current.latitude,
        longitude: pickedRef.current.longitude,
      },
    });
  }

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      />

      {/* ---- คำแนะนำด้านบน ---- */}
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.sm }]} pointerEvents="none">
        <View style={styles.hintPill}>
          <Ionicons name="move" size={15} color={theme.colors.primaryDark} />
          <Text style={styles.hintText}>เลื่อนแผนที่ให้หมุดตรงกับหน้าร้าน</Text>
        </View>
      </View>

      {/*
        ---- หมุดกลางจอ ----
        pointerEvents="none" สำคัญมาก ถ้าไม่ใส่ หมุดจะดักการแตะไว้
        ทำให้เลื่อนแผนที่ตรงกลางจอไม่ได้เลย ต้องไปลากที่ขอบจอแทน
      */}
      <View style={styles.pinLayer} pointerEvents="none">
        <View style={styles.pinWrap}>
          <View style={styles.pinHead}>
            <Ionicons name="storefront" size={22} color={theme.colors.textOnPrimary} />
          </View>
          <View style={styles.pinTail} />
          {/* เงาใต้หมุด ช่วยให้รู้ว่าหมุดชี้ลงที่จุดไหนบนพื้น */}
          <View style={styles.pinShadow} />
        </View>
      </View>

      {/* ---- ปุ่มไปตำแหน่งปัจจุบัน ---- */}
      <TouchableOpacity
        style={[styles.gpsButton, { bottom: insets.bottom + 150 }]}
        onPress={() => { void goToCurrentLocation(); }}
        activeOpacity={0.85}
      >
        {locating ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Ionicons name="locate" size={22} color={theme.colors.primaryDark} />
        )}
      </TouchableOpacity>

      {/* ---- แถบยืนยันด้านล่าง ---- */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <View style={styles.coordRow}>
          <Ionicons name="pin" size={15} color={theme.colors.textSecondary} />
          <Text style={styles.coordText}>
            {display.latitude.toFixed(5)}, {display.longitude.toFixed(5)}
          </Text>
        </View>

        <AppButton title="ยืนยันตำแหน่งนี้" onPress={confirm} />

        <AppButton
          title="ยกเลิก"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: theme.spacing.xs }}
        />
      </View>
    </View>
  );
}

const PIN_SIZE = 42;
const TAIL_HEIGHT = 12;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    ...theme.shadows.floating,
  },
  hintText: { ...theme.textStyles.caption, color: theme.colors.primaryDark },

  /*
   * ชั้นของหมุด ครอบเต็มจอแล้วจัดให้อยู่กึ่งกลาง
   *
   * ดัน marginBottom ลงมาเท่ากับความสูงของหมุด
   * เพื่อให้ "ปลายแหลม" อยู่ตรงกลางจอพอดี ไม่ใช่ "กลางวงกลม"
   * เพราะจุดที่แผนที่ถือว่าเป็นศูนย์กลางคือกึ่งกลางจอเป๊ะ ๆ
   */
  pinLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pinWrap: { alignItems: 'center', marginBottom: PIN_SIZE + TAIL_HEIGHT },

  pinHead: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -3,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: TAIL_HEIGHT,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.surface,
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 1,
  },

  gpsButton: {
    position: 'absolute',
    right: theme.spacing.md,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.floating,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    ...theme.shadows.floating,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  coordText: {
    ...theme.textStyles.caption,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
