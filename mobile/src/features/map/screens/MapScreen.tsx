/**
 * แผนที่ร้านใกล้เคียง
 *
 * แผนที่ใช้ OpenStreetMap ผ่านคอมโพเนนต์ OsmMap (ดูเหตุผลที่ไฟล์นั้น)
 * ไม่ต้องใช้ API Key ไม่ต้องผูกบัตร ใครดึงโค้ดไป build ก็ใช้ได้ทันที
 *
 * ลำดับการทำงาน
 *   1. ขออนุญาตเข้าถึงตำแหน่ง
 *   2. ได้พิกัดแล้วยิง GET /api/stores/nearby
 *   3. ปักหมุดร้าน + วาดวงรัศมี + แสดงรายชื่อร้านในแผ่นเลื่อนด้านล่าง
 *
 * *** เลย์เอาต์ : แผนที่เต็มจอ + แผ่นเลื่อน (bottom sheet) ***
 * เดิมรายการร้านเป็นการ์ดเรียงแนวนอนให้ปัดทีละใบ ปัญหาคือ
 *   - เห็นได้ทีละ 1 ร้าน ไม่รู้ว่ามีทั้งหมดกี่ร้านและร้านไหนใกล้กว่ากัน
 *   - ปัดแนวนอนบนแผนที่ นิ้วมักไปโดนแผนที่แล้วแผนที่เลื่อนแทน
 *
 * แบบใหม่ใช้วิธีเดียวกับ Google Maps / Grab / Airbnb คือ
 *   - แผนที่เต็มจอ (absoluteFill) อยู่ชั้นล่างสุด
 *   - แผ่นรายการร้านลอยทับด้านล่าง ลากขึ้น-ลงได้ 3 ระดับ (ย่อ / ครึ่งจอ / เต็ม)
 *   - ในแผ่นเป็นรายการแนวตั้ง เลื่อนดูได้เหมือนรายการทั่วไป
 *
 * *** ทำไมไม่ใช้ไลบรารี bottom sheet ***
 * ตัวที่นิยม (@gorhom/bottom-sheet) ต้องพ่วง reanimated + gesture-handler
 * ซึ่งเป็นแพ็กเกจที่ผูกกับเวอร์ชัน Expo Go แน่นมาก ลงผิดเวอร์ชันแอปพังทั้งตัว
 * ที่นี่ใช้ Animated + PanResponder ที่ติดมากับ React Native อยู่แล้ว
 * ไม่ต้อง npm install อะไรเพิ่มเลย และไม่มีทางทำให้ SDK 54 หลุด
 *
 * หลัก UX : ไม่บังคับให้เปิด GPS ถ้าไม่อนุญาต ยังกดดูรายการร้านแบบไม่มีระยะทางได้
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  useWindowDimensions, Animated, PanResponder, Image, ScrollView,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OsmMap, { OsmMarker, OsmCircle } from '../../../components/OsmMap';
import type { Region, OsmMapHandle } from '../../../components/OsmMap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StoreWithDistance } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';

import storeService from '../../store/storeService';
import locationService from '../../../core/services/locationService';
import type { Coordinates } from '../../../core/services/locationService';
import { errorMessage } from '../../../core/services/apiClient';
import { imageUrl } from '../../../core/constants/apiConstants';
import { RADIUS } from '../../../core/constants/appConstants';
import { useFilter } from '../../../context/FilterContext';
import { formatDistance, formatRating } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { CustomerStackParamList } from '../../../navigation/types';

type Navigation = NativeStackNavigationProp<CustomerStackParamList>;

/*
 * หมุดร้านค้าเป็นไฟล์รูป ไม่ได้วาดด้วย View
 *
 * *** เคยวาดด้วย View แล้วเจอปัญหาบน Android ***
 * หมุดที่ใส่ View เข้าไปเอง จะถูกถ่ายเป็นภาพก่อนแล้วค่อยแปะลงแผนที่
 * ซึ่งบางจังหวะฟอนต์ไอคอนยังโหลดไม่เสร็จ ภาพที่ถ่ายได้เลยออกมาเละ
 * เป็นก้อนสีเขียวมั่ว ๆ และแก้ให้นิ่งได้ยากมากเพราะขึ้นกับจังหวะเวลา
 *
 * ใช้ไฟล์รูปแทน แผนที่เอาไปแปะได้ตรง ๆ ไม่ต้องถ่ายภาพ
 * จึงเหมือนกันทุกเครื่องทุกครั้ง และเบากว่าด้วย
 *
 * ไฟล์มี 3 ขนาด (.png / @2x / @3x) React Native เลือกให้เองตามความละเอียดจอ
 */

/** จุดกึ่งกลางกรุงเทพฯ ใช้ตอนยังไม่รู้ตำแหน่งผู้ใช้ */
const FALLBACK_REGION: Region = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/**
 * ความสูงของ 1 แถวในรายการร้าน (คงที่)
 *
 * *** ต้องคงที่ ไม่งั้น scrollToIndex พัง ***
 * ตอนกดหมุดบนแผนที่ เราสั่งให้รายการเลื่อนไปหาร้านนั้น
 * FlatList จะคำนวณตำแหน่งได้ก็ต่อเมื่อรู้ความสูงแถวล่วงหน้า (getItemLayout)
 * ถ้าปล่อยให้แถวสูงไม่เท่ากัน มันจะต้องเรนเดอร์ไปเรื่อย ๆ เพื่อหา แล้วกระตุก
 */
const ROW_HEIGHT = 84;
const ROW_GAP = 1;

/** ความสูงส่วนที่ยังโผล่อยู่ตอนย่อแผ่นลงต่ำสุด (ที่จับ + หัวข้อ) */
const PEEK_HEIGHT = 116;

/** ระยะที่ซูมเข้าไปตอนกดเลือกร้าน (องศา) ~ 700 เมตร */
const FOCUS_DELTA = 0.007;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function MapScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { filters, setFilters } = useFilter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const mapRef = useRef<OsmMapHandle | null>(null);
  const listRef = useRef<FlatList<StoreWithDistance> | null>(null);

  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // ---- ขนาดแผ่นเลื่อน ----
  // วัดพื้นที่จริงที่หน้านี้ได้ (ไม่รวมแถบแท็บล่าง) แทนการเดาจากความสูงจอ
  const [areaHeight, setAreaHeight] = useState<number>(windowHeight);
  const sheetHeight = Math.round(areaHeight * 0.82);

  /**
   * ตำแหน่งหยุด 3 ระดับ - เป็นค่า translateY (ยิ่งเลขมาก = แผ่นยิ่งเลื่อนลงต่ำ)
   *   full = สุดขอบบนของแผ่น   half = โผล่ประมาณครึ่งจอ   peek = ย่อเหลือแค่หัวข้อ
   */
  const snapPoints = {
    full: 0,
    half: clamp(sheetHeight - Math.round(areaHeight * 0.46), 0, sheetHeight - PEEK_HEIGHT),
    peek: Math.max(0, sheetHeight - PEEK_HEIGHT),
  };

  const translateY = useRef(new Animated.Value(0)).current;
  /** ค่า translateY ล่าสุดแบบอ่านได้ทันที (Animated.Value อ่านตรง ๆ ไม่ได้) */
  const currentY = useRef(0);
  /** ค่า translateY ตอนเริ่มลาก ใช้บวกกับระยะที่นิ้วลากไป */
  const dragStartY = useRef(0);
  /**
   * PanResponder ถูกสร้างครั้งเดียวตอน mount จึงมองไม่เห็น state ที่เปลี่ยนทีหลัง
   * เลยยัดค่า snap ล่าสุดไว้ใน ref ให้มันอ่านได้เสมอ
   */
  const snapRef = useRef(snapPoints);
  snapRef.current = snapPoints;

  const [sheetState, setSheetState] = useState<'full' | 'half' | 'peek'>('half');

  useEffect(() => {
    const id = translateY.addListener(({ value }) => { currentY.current = value; });
    return () => { translateY.removeListener(id); };
  }, [translateY]);

  const snapTo = useCallback((key: 'full' | 'half' | 'peek'): void => {
    setSheetState(key);
    Animated.spring(translateY, {
      toValue: snapRef.current[key],
      useNativeDriver: true,
      bounciness: 2,
      speed: 14,
    }).start();
  }, [translateY]);

  // พอวัดพื้นที่จริงได้แล้ว (หรือหมุนจอ) ต้องขยับแผ่นไปยังตำแหน่งใหม่ของระดับเดิม
  useEffect(() => {
    translateY.setValue(snapRef.current[sheetState]);
    // ตั้งใจให้ทำงานเฉพาะตอนขนาดพื้นที่เปลี่ยน ไม่ใช่ทุกครั้งที่ sheetState เปลี่ยน
    // (การเปลี่ยนระดับปกติใช้ snapTo ซึ่งมีอนิเมชันอยู่แล้ว)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaHeight, sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      // ต้องลากเกิน 4px ก่อนถึงจะยึดนิ้ว ไม่งั้นแตะปุ่มในหัวข้อแล้วกลายเป็นลากแทน
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { dragStartY.current = currentY.current; },
      onPanResponderMove: (_e, g) => {
        const { full, peek } = snapRef.current;
        translateY.setValue(clamp(dragStartY.current + g.dy, full, peek));
      },
      onPanResponderRelease: (_e, g) => {
        const { full, half, peek } = snapRef.current;
        /*
         * บวกความเร็วนิ้วเข้าไปด้วย (vy * 140) เพื่อให้ "สะบัด" เร็ว ๆ แล้วไปสุด
         * ถ้าดูแค่ตำแหน่งที่ปล่อย การสะบัดสั้น ๆ จะเด้งกลับที่เดิม ผู้ใช้จะรู้สึกว่าฝืด
         */
        const projected = clamp(dragStartY.current + g.dy + g.vy * 140, full, peek);
        const nearest = ([['full', full], ['half', half], ['peek', peek]] as const)
          .reduce((best, item) =>
            Math.abs(item[1] - projected) < Math.abs(best[1] - projected) ? item : best);
        setSheetState(nearest[0]);
        Animated.spring(translateY, {
          toValue: nearest[1],
          useNativeDriver: true,
          bounciness: 2,
          speed: 14,
        }).start();
      },
    })
  ).current;

  // ---- โหลดข้อมูล ----
  const load = useCallback(async (): Promise<void> => {
    setError(null);
    setPermissionDenied(false);

    const coords = await locationService.getCurrentPosition().catch(() => null);
    if (coords === null) {
      // ไม่ได้ตำแหน่ง = ผู้ใช้ไม่อนุญาต หรือปิด GPS อยู่
      setPermissionDenied(true);
      setStores([]);
      return;
    }

    setPosition(coords);
    try {
      setStores(await storeService.getNearby(coords.latitude, coords.longitude, filters.radiusKm));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters.radiusKm]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [load])
  );

  async function handleAllowLocation(): Promise<void> {
    setLoading(true);
    await locationService.requestPermission();
    await load();
    setLoading(false);
  }

  /** เปลี่ยนรัศมี : ล้างร้านที่เลือกไว้ด้วย เพราะร้านนั้นอาจหลุดออกนอกรัศมีใหม่ */
  function handleRadiusChange(km: number): void {
    if (km === filters.radiusKm) return;
    setSelectedId(null);
    setFilters({ radiusKm: km });
  }

  /**
   * เลือกร้าน 1 ร้าน = เลื่อนแผนที่ไปหา + เปลี่ยนหมุดเป็นสีเข้ม + ย่อแผ่นลงให้เห็นแผนที่
   * (ถ้าไม่ย่อแผ่นลง แผนที่ที่เพิ่งเลื่อนไปจะโดนแผ่นบังจนไม่เห็นว่าเลื่อนไปแล้ว)
   */
  const focusStore = useCallback((store: StoreWithDistance): void => {
    setSelectedId(store.store_id);
    if (store.latitude !== null && store.longitude !== null) {
      mapRef.current?.animateToRegion({
        latitude: Number(store.latitude),
        longitude: Number(store.longitude),
        latitudeDelta: FOCUS_DELTA,
        longitudeDelta: FOCUS_DELTA,
      }, 450);
    }
    snapTo('peek');
  }, [snapTo]);

  /** กดหมุดบนแผนที่ = เลือกร้าน + เลื่อนรายการไปที่ร้านนั้นให้เห็นพร้อมกัน */
  function handleMarkerPress(store: StoreWithDistance): void {
    setSelectedId(store.store_id);
    const index = stores.findIndex((s) => s.store_id === store.store_id);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    }
    if (sheetState === 'full') snapTo('half');
  }

  if (loading) {
    return <LoadingView message="กำลังหาร้านใกล้คุณ..." />;
  }

  // ---- ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง ----
  if (permissionDenied) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="location-outline"
          title="ยังไม่ได้เปิดการเข้าถึงตำแหน่ง"
          message="แผนที่ต้องใช้ตำแหน่งของคุณเพื่อหาร้านที่อยู่ใกล้ ข้อมูลนี้ใช้ในเครื่องเท่านั้น ไม่ได้เก็บไว้"
          actionLabel="อนุญาตให้เข้าถึงตำแหน่ง"
          onAction={() => { void handleAllowLocation(); }}
        />
      </ScreenContainer>
    );
  }

  const region: Region = position === null
    ? FALLBACK_REGION
    : {
        latitude: position.latitude,
        longitude: position.longitude,
        // ให้วงรัศมีพอดีจอ : 1 องศาละติจูด ~ 111 กม. คูณ 2.6 เผื่อขอบซ้าย-ขวา
        latitudeDelta: (filters.radiusKm / 111) * 2.6,
        longitudeDelta: (filters.radiusKm / 111) * 2.6,
      };

  return (
    // ไม่ใช้ ScreenContainer ตรงนี้ เพราะอยากให้แผนที่ลอดใต้แถบสถานะขึ้นไปด้วย
    // จึงจัดการระยะปลอดภัย (insets) เองเฉพาะกับของที่ลอยอยู่
    <View
      style={styles.screen}
      onLayout={(e: LayoutChangeEvent) => { setAreaHeight(e.nativeEvent.layout.height); }}
    >
      {/* ---- แผนที่เต็มจอ ---- */}
      <OsmMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        /* จุดสีฟ้าบอกตำแหน่งเรา - ส่งพิกัดเข้าไปเอง ไม่ได้ให้แผนที่ไปขอ GPS ซ้ำ */
        userLocation={position}
        /* แตะที่ว่างบนแผนที่ = ยกเลิกการเลือกร้าน */
        onPress={() => setSelectedId(null)}
      >
        {/* วงรัศมีที่กำลังกรองอยู่ ให้เห็นด้วยตาว่า "ใกล้" แค่ไหน */}
        {position !== null ? (
          <OsmCircle
            center={position}
            radius={filters.radiusKm * 1000}
            strokeColor={theme.colors.primary}
            fillColor={theme.colors.primary}
          />
        ) : null}

        {stores.map((store) => {
          if (store.latitude === null || store.longitude === null) return null;
          const isSelected = selectedId === store.store_id;

          return (
            <OsmMarker
              key={store.store_id}
              coordinate={{
                latitude: Number(store.latitude),
                longitude: Number(store.longitude),
              }}
              title={store.store_name}
              description={formatDistance(store.distance_km)}
              /* หมุดที่เลือกอยู่เป็นสีเข้มและใหญ่กว่า จะได้รู้ว่ากำลังดูร้านไหน */
              selected={isSelected}
              onPress={() => handleMarkerPress(store)}
            />
          );
        })}
      </OsmMap>

      {/* ---- ชั้นลอยด้านบน : จำนวนร้าน + ปุ่มกรองระยะทาง ---- */}
      <View
        style={[styles.topLayer, { paddingTop: insets.top + theme.spacing.sm }]}
        pointerEvents="box-none"
      >
        <View style={styles.countPill}>
          <Ionicons name="storefront" size={14} color={theme.colors.primaryDark} />
          <Text style={styles.countText}>
            พบ {stores.length} ร้าน ในรัศมี {filters.radiusKm} กม.
          </Text>
        </View>

        {/*
          ปุ่มระยะสำเร็จรูป - กดปุ๊บกรองปั๊บ ไม่ต้องเข้าหน้าตัวกรอง
          ทำเป็นแถวเลื่อนแนวนอน เผื่อจอแคบหรือวันหลังเพิ่มตัวเลือก จะได้ไม่ล้นจอ
        */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.radiusRow}
          style={styles.radiusScroll}
        >
          {RADIUS.OPTIONS.map((km) => {
            const active = filters.radiusKm === km;
            return (
              <TouchableOpacity
                key={km}
                style={[styles.radiusChip, active ? styles.radiusChipActive : null]}
                onPress={() => handleRadiusChange(km)}
                activeOpacity={0.8}
              >
                <Text style={[styles.radiusText, active ? styles.radiusTextActive : null]}>
                  {km} กม.
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ---- แผ่นรายการร้าน (ลากขึ้น-ลงได้) ---- */}
      <Animated.View
        style={[
          styles.sheet,
          { height: sheetHeight, transform: [{ translateY }] },
        ]}
      >
        {/*
          ที่จับสำหรับลาก - ผูก PanResponder ไว้เฉพาะตรงนี้ ไม่ผูกทั้งแผ่น
          เพราะถ้าผูกทั้งแผ่น การเลื่อนรายการในลิสต์จะกลายเป็นการลากแผ่นแทน
        */}
        <View {...panResponder.panHandlers} style={styles.sheetHeader}>
          <View style={styles.grabber} />

          <View style={styles.sheetTitleRow}>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle}>ร้านค้าใกล้เคียง</Text>
              <Text style={styles.sheetSubtitle}>
                {stores.length > 0
                  ? `${stores.length} ร้าน · เรียงจากใกล้ไปไกล`
                  : `ไม่พบร้านในรัศมี ${filters.radiusKm} กม.`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => snapTo(sheetState === 'full' ? 'peek' : 'full')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={sheetState === 'full' ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ---- เนื้อในแผ่น ---- */}
        {error !== null ? (
          <View style={styles.infoCard}>
            <Ionicons name="cloud-offline-outline" size={22} color={theme.colors.error} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>โหลดร้านไม่สำเร็จ</Text>
              <Text style={styles.infoMessage} numberOfLines={2}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => { void handleAllowLocation(); }}
            >
              <Text style={styles.retryText}>ลองใหม่</Text>
            </TouchableOpacity>
          </View>
        ) : stores.length === 0 ? (
          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={22} color={theme.colors.textMuted} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>ไม่มีร้านในรัศมีนี้</Text>
              <Text style={styles.infoMessage}>
                ลองกดขยายรัศมีที่ปุ่มด้านบน หรือกลับมาดูใหม่ช่วงเย็นซึ่งร้านลงขายเยอะที่สุด
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={stores}
            keyExtractor={(item) => String(item.store_id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + theme.spacing.xl },
            ]}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            // บอกความสูงล่วงหน้า เพื่อให้ scrollToIndex ตอนกดหมุดทำงานได้ทันที
            getItemLayout={(_data, index) => ({
              length: ROW_HEIGHT + ROW_GAP,
              offset: (ROW_HEIGHT + ROW_GAP) * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              // กันพลาดกรณีลิสต์ยังเรนเดอร์ไม่ถึงแถวนั้น : เลื่อนแบบคำนวณตำแหน่งเอง
              listRef.current?.scrollToOffset({
                offset: (ROW_HEIGHT + ROW_GAP) * index,
                animated: true,
              });
            }}
            renderItem={({ item }) => {
              const selected = selectedId === item.store_id;
              const photo = imageUrl(item.image, 'store');

              return (
                <TouchableOpacity
                  style={[styles.row, selected ? styles.rowSelected : null]}
                  activeOpacity={0.7}
                  /*
                   * แตะที่แถว = เข้าหน้ารายละเอียดร้านทันที
                   *
                   * เดิมต้องแตะสองครั้ง ครั้งแรกแค่เลื่อนแผนที่ ครั้งที่สองถึงจะเข้าหน้าร้าน
                   * ผู้ทดสอบเข้าใจว่าแถวนี้กดไม่ได้ เพราะแตะครั้งแรกแล้วหน้าจอไม่เปลี่ยน
                   * จึงย้ายหน้าที่ "เลื่อนแผนที่ไปหาร้าน" ไปไว้ที่ปุ่มหมุดด้านขวาแทน
                   * แถวในรายการจึงทำงานเหมือนรายการทั่วไป คือแตะครั้งเดียวแล้วเข้าเลย
                   */
                  onPress={() => navigation.navigate('StoreDetail', { storeId: item.store_id })}
                >
                  {photo !== null ? (
                    <Image source={{ uri: photo }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Ionicons name="storefront" size={20} color={theme.colors.primary} />
                    </View>
                  )}

                  <View style={styles.rowBody}>
                    <Text style={styles.storeName} numberOfLines={1}>{item.store_name}</Text>
                    {item.address !== null ? (
                      <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Ionicons name="navigate-outline" size={12} color={theme.colors.primaryDark} />
                      <Text style={styles.distance}>{formatDistance(item.distance_km)}</Text>
                      {Number(item.rating) > 0 ? (
                        <>
                          <Text style={styles.metaDot}>·</Text>
                          <Ionicons name="star" size={12} color={theme.colors.star} />
                          <Text style={styles.meta}>
                            {formatRating(item.rating, item.review_count)}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>

                  {/*
                    ปุ่มหมุด = เลื่อนแผนที่ไปหาร้านนี้ โดยไม่ต้องออกจากหน้าแผนที่
                    ใช้ตอนอยากเทียบว่าร้านไหนอยู่ตรงไหนก่อนตัดสินใจเข้าไปดู
                  */}
                  <TouchableOpacity
                    style={styles.openButton}
                    onPress={() => focusStore(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`ดูตำแหน่ง ${item.store_name} บนแผนที่`}
                  >
                    <Ionicons
                      name="locate"
                      size={18}
                      color={selected ? theme.colors.primaryDark : theme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* ลูกศรเป็นแค่สัญลักษณ์บอกว่าแถวนี้กดเข้าไปต่อได้ ไม่ใช่ปุ่ม */}
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({

  screen: { flex: 1, backgroundColor: theme.colors.surfaceAlt },

  // ---- ชั้นลอยด้านบน ----
  topLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.floating,
  },
  countText: { ...theme.textStyles.caption, color: theme.colors.primaryDark },

  // ---- ปุ่มกรองระยะทาง ----
  radiusScroll: { flexGrow: 0, alignSelf: 'stretch' },
  radiusRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
  },
  radiusChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  radiusChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  radiusText: { ...theme.textStyles.caption, color: theme.colors.textSecondary },
  radiusTextActive: { color: theme.colors.textOnPrimary },

  // ---- แผ่นรายการร้าน ----
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    ...theme.shadows.floating,
  },
  sheetHeader: {
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.sm,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  sheetTitleWrap: { flex: 1 },
  sheetTitle: { ...theme.textStyles.subheading },
  sheetSubtitle: { ...theme.textStyles.caption, marginTop: 1 },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },

  // ---- รายการร้าน ----
  listContent: { paddingHorizontal: theme.spacing.md },
  divider: { height: ROW_GAP, backgroundColor: theme.colors.border },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  rowSelected: {
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  rowBody: { flex: 1 },
  storeName: { ...theme.textStyles.subheading },
  address: { ...theme.textStyles.caption, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  distance: { ...theme.textStyles.caption, color: theme.colors.primaryDark },
  metaDot: { ...theme.textStyles.caption, color: theme.colors.textMuted, marginHorizontal: 2 },
  meta: { ...theme.textStyles.caption, color: theme.colors.textSecondary },
  openButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- การ์ดแจ้งสถานะ (ไม่เจอร้าน / โหลดไม่สำเร็จ) ----
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  infoTextWrap: { flex: 1 },
  infoTitle: { ...theme.textStyles.subheading },
  infoMessage: { ...theme.textStyles.caption, marginTop: 2 },
  retryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
  },
  retryText: { ...theme.textStyles.caption, color: theme.colors.primaryDark },
});
