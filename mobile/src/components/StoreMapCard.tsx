/**
 * การ์ดแผนที่ร้าน (แบบย่อ)
 *
 * แสดงหมุดร้านบนแผนที่เล็ก ๆ แตะแล้วเปิดหน้าแผนที่เต็มจอ
 *
 * *** ทำไมหน้าจองต้องมีแผนที่ ***
 * SaveEats ไม่มีบริการจัดส่ง ลูกค้าต้องเดินทางไปรับเองทุกครั้ง
 * "ที่อยู่" ที่เป็นตัวหนังสือยาว ๆ อ่านแล้วยังนึกภาพไม่ออกว่าอยู่ตรงไหน
 * โดยเฉพาะที่อยู่แบบหอพัก/ซอย ที่ต่อให้อ่านครบก็ยังหาไม่เจอ
 *
 * เห็นหมุดบนแผนที่หนึ่งครั้ง เข้าใจทันทีว่าไกลแค่ไหนและไปทางไหน
 * จึงตัดสินใจกดจองได้เร็วขึ้น และไม่จองแล้วไปไม่ถึงจนคิวหลุด
 *
 * *** แผนที่ในการ์ดนี้แตะเลื่อนไม่ได้ตั้งใจ ***
 * ถ้าเลื่อนได้ นิ้วที่กำลังปัดหน้าจอลงจะไปโดนแผนที่แล้วเลื่อนแผนที่แทน
 * ผู้ใช้จะรู้สึกว่าหน้าค้าง จึงปิดการโต้ตอบทั้งหมดแล้วให้ทั้งการ์ดเป็นปุ่มแทน
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import OsmMap, { OsmMarker } from './OsmMap';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../core/theme/theme';


interface StoreMapCardProps {
  storeName: string;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
  /** แตะการ์ดแล้วทำอะไร (ปกติคือเปิดหน้าแผนที่เต็มจอ) */
  onPress: () => void;
}

export default function StoreMapCard({
  storeName,
  address,
  latitude,
  longitude,
  onPress,
}: StoreMapCardProps): JSX.Element {
  /*
   * ร้านที่ยังไม่ได้ปักหมุด (ตอนสมัครแล้วยังไม่ได้ไปตั้งพิกัด)
   * ต้องไม่ทำให้หน้าพัง แค่บอกตรง ๆ ว่ายังไม่มีตำแหน่ง แล้วโชว์ที่อยู่แทน
   */
  const hasLocation =
    latitude !== null && longitude !== null
    && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  if (!hasLocation) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>ตำแหน่งร้าน</Text>
        <View style={styles.noLocation}>
          <Ionicons name="location-outline" size={20} color={theme.colors.textMuted} />
          <Text style={styles.noLocationText}>
            {address ?? 'ร้านนี้ยังไม่ได้ปักหมุดตำแหน่งบนแผนที่'}
          </Text>
        </View>
      </View>
    );
  }

  const coordinate = { latitude: Number(latitude), longitude: Number(longitude) };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ตำแหน่งร้าน</Text>

      <TouchableOpacity style={styles.mapBox} onPress={onPress} activeOpacity={0.85}>
        {/*
          pointerEvents="none" ทำให้นิ้วทะลุผ่านแผนที่ไปโดน TouchableOpacity ข้างนอก
          แผนที่จึงกลายเป็นแค่ "ภาพ" ไม่แย่งการปัดหน้าจอไปจากผู้ใช้
        */}
        <View style={styles.mapFill} pointerEvents="none">
          <OsmMap
            style={styles.mapFill}
            /* 0.004 องศา ~ 400 เมตร กำลังเห็นซอยรอบ ๆ ร้านพอดี */
            initialRegion={{ ...coordinate, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <OsmMarker coordinate={coordinate} />
          </OsmMap>
        </View>

        <View style={styles.overlay}>
          <Ionicons name="expand-outline" size={14} color={theme.colors.textOnPrimary} />
          <Text style={styles.overlayText}>แตะเพื่อดูแผนที่เต็มจอ</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.addressRow}>
        <Ionicons name="storefront-outline" size={16} color={theme.colors.primaryDark} />
        <View style={styles.addressInfo}>
          <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
          {address !== null && address !== undefined && address !== '' ? (
            <Text style={styles.address} numberOfLines={2}>{address}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  title: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },

  mapBox: {
    height: 150,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
  },
  mapFill: { ...StyleSheet.absoluteFillObject },
  overlay: {
    position: 'absolute',
    right: theme.spacing.sm,
    bottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  overlayText: { ...theme.textStyles.caption, color: theme.colors.textOnPrimary },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addressInfo: { flex: 1 },
  storeName: { ...theme.textStyles.body },
  address: { ...theme.textStyles.caption, marginTop: 1 },

  noLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  noLocationText: { ...theme.textStyles.caption, flex: 1 },
});
