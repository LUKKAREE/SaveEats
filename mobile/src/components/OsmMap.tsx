/**
 * แผนที่ OpenStreetMap (ใช้แทน react-native-maps ของ Google)
 *
 * ==========================================================
 *  *** ทำไมไม่ใช้ Google Maps ***
 * ==========================================================
 * react-native-maps บน Android ต้องใช้ Google Maps API Key เสมอ
 * และการขอคีย์ต้องผูกบัตรเครดิตกับ Google Cloud
 *
 * ที่แย่กว่านั้นคือ ถ้าไม่มีคีย์ แอปจะ "ดับทันที" ตอนเปิดหน้าแผนที่
 * ไม่ใช่แค่แผนที่ไม่ขึ้น — และคีย์เก็บอยู่ในไฟล์ .env ซึ่งไม่ได้ขึ้น git
 * แปลว่าใครก็ตามในทีมที่ build แอปเองจะได้แอปที่ดับทุกคน
 *
 * ไฟล์นี้เปลี่ยนไปใช้ OpenStreetMap แทน ซึ่ง
 *   - ไม่ต้องมีคีย์ ไม่ต้องผูกบัตร ไม่มีโควตา
 *   - ใครดึงโค้ดไป build ก็ใช้ได้ทันที ไม่ต้องตั้งค่าอะไรเพิ่ม
 *
 * ==========================================================
 *  *** ทำงานยังไง ***
 * ==========================================================
 * ข้างในเป็น WebView ที่โหลดหน้าเว็บเล็ก ๆ ซึ่งใช้ Leaflet วาดแผนที่
 * แล้วเราคุยกับหน้าเว็บนั้นสองทาง
 *   ฝั่งแอป -> เว็บ : injectJavaScript ส่งข้อมูลหมุด/วงกลม/ตำแหน่งเข้าไป
 *   เว็บ -> ฝั่งแอป : postMessage ส่งเหตุการณ์กลับมา (กดหมุด / เลื่อนแผนที่เสร็จ)
 *
 * *** ระยะทางไม่ได้คำนวณที่นี่ ***
 * ระยะทางทั้งหมดคำนวณที่ Backend (backend/src/utils/geo.ts สูตร Haversine)
 * ไฟล์นี้มีหน้าที่ "วาดภาพ" อย่างเดียว เปลี่ยนผู้ให้บริการแผนที่จึงไม่กระทบตัวเลขใด ๆ
 *
 * ==========================================================
 *  *** วิธีใช้ ***
 * ==========================================================
 * ตั้งใจให้หน้าตาเหมือน react-native-maps เพื่อให้แก้หน้าจอเดิมน้อยที่สุด
 *
 *   <OsmMap ref={mapRef} initialRegion={region} onPress={...}>
 *     <OsmCircle center={pos} radius={2000} />
 *     <OsmMarker coordinate={c} title="ร้าน" onPress={...} selected />
 *   </OsmMap>
 */
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  Children,
  isValidElement,
} from 'react';
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { theme } from '../core/theme/theme';

/* ------------------------------------------------------------------ */
/*  ชนิดข้อมูล (ตั้งชื่อให้ตรงกับ react-native-maps เดิม)              */
/* ------------------------------------------------------------------ */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Region extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

/** สิ่งที่เรียกผ่าน ref ได้ (ใช้แทน mapRef.current?.animateToRegion เดิม) */
export interface OsmMapHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  หมุด และ วงกลม                                                     */
/* ------------------------------------------------------------------ */

export interface OsmMarkerProps {
  coordinate: LatLng;
  title?: string;
  description?: string;
  /** หมุดที่ถูกเลือกอยู่ จะเป็นสีเข้มและอยู่บนสุด */
  selected?: boolean;
  onPress?: () => void;
}

/**
 * หมุดบนแผนที่
 *
 * *** ตัวนี้ไม่ได้วาดอะไรเอง ***
 * มันคืนค่า null เสมอ ทำหน้าที่เป็นแค่ "ใบสั่ง" ให้ OsmMap อ่านค่า props ไปวาดในแผนที่
 * ทำแบบนี้เพื่อให้เขียน JSX ได้เหมือนของเดิมทุกประการ หน้าจอเดิมจึงแทบไม่ต้องแก้
 */
export function OsmMarker(_props: OsmMarkerProps): null {
  return null;
}

export interface OsmCircleProps {
  center: LatLng;
  /** รัศมีเป็น "เมตร" (เหมือน react-native-maps) */
  radius: number;
  strokeColor?: string;
  fillColor?: string;
}

/** วงกลมรัศมี - เป็นใบสั่งเหมือน OsmMarker ไม่ได้วาดเอง */
export function OsmCircle(_props: OsmCircleProps): null {
  return null;
}

/* ------------------------------------------------------------------ */
/*  ตัวแผนที่                                                          */
/* ------------------------------------------------------------------ */

export interface OsmMapProps {
  style?: StyleProp<ViewStyle>;
  /** ตำแหน่งเริ่มต้น (ใช้ครั้งเดียวตอนเปิด) */
  initialRegion?: Region;
  /** ตำแหน่งที่ถูกควบคุมจากภายนอก (เปลี่ยนเมื่อไหร่แผนที่เลื่อนตาม) */
  region?: Region;
  /** จุดสีฟ้าบอกตำแหน่งผู้ใช้ - ต้องส่งพิกัดมาเอง */
  userLocation?: LatLng | null;
  /** แตะที่ว่างบนแผนที่ */
  onPress?: () => void;
  /** เลื่อนแผนที่เสร็จแล้ว (ยกนิ้ว) - ใช้กับหน้าปักหมุดที่อ่านจุดกึ่งกลาง */
  onRegionChangeComplete?: (region: Region) => void;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  children?: ReactNode;
}

interface MarkerSpec {
  index: number;
  lat: number;
  lng: number;
  title: string;
  selected: boolean;
}

interface CircleSpec {
  lat: number;
  lng: number;
  radius: number;
  stroke: string;
  fill: string;
}

interface IncomingMessage {
  type?: string;
  index?: number;
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

/**
 * แปลงระยะองศาเป็นระดับซูมของ Leaflet
 *
 * react-native-maps บอกความกว้างที่เห็นเป็น "องศา" (latitudeDelta)
 * ส่วน Leaflet ใช้ "ระดับซูม" 0-19 จึงต้องแปลงกัน
 * โลกกว้าง 360 องศา ทุกครั้งที่ซูมเข้า 1 ระดับจะเห็นแคบลงครึ่งหนึ่ง
 */
function deltaToZoom(delta: number): number {
  if (!Number.isFinite(delta) || delta <= 0) return 15;
  const zoom = Math.log2(360 / delta);
  return Math.min(19, Math.max(3, Math.round(zoom)));
}

/** หน้าเว็บ Leaflet ที่อยู่ข้างใน WebView - สร้างครั้งเดียว ไม่เปลี่ยนอีก */
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#e8eef3; }
  .leaflet-container { background:#e8eef3; font-family: sans-serif; }
  .pin { width:26px; height:26px; border-radius:50% 50% 50% 0; transform:rotate(-45deg);
         border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,.4); }
  .pin i { display:block; width:8px; height:8px; margin:7px 0 0 7px; background:#fff;
           border-radius:50%; }
  .dot { width:16px; height:16px; border-radius:8px; background:#1a73e8;
         border:3px solid #fff; box-shadow:0 0 0 4px rgba(26,115,232,.25); }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true });
  map.setView([13.7563, 100.5018], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var markerLayer = L.layerGroup().addTo(map);
  var circleLayer = null;
  var userLayer = null;
  var muteMoveEvent = false;

  function send(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function pinIcon(color, big) {
    var size = big ? 32 : 26;
    return L.divIcon({
      className: '',
      html: '<div class="pin" style="background:' + color + ';width:' + size + 'px;height:' + size + 'px"><i></i></div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size]
    });
  }

  map.on('click', function () { send({ type: 'press' }); });

  map.on('moveend', function () {
    if (muteMoveEvent) { muteMoveEvent = false; return; }
    var c = map.getCenter();
    var b = map.getBounds();
    send({
      type: 'regionChange',
      latitude: c.lat,
      longitude: c.lng,
      latitudeDelta: Math.abs(b.getNorth() - b.getSouth()),
      longitudeDelta: Math.abs(b.getEast() - b.getWest())
    });
  });

  /* รับข้อมูลจากฝั่งแอป */
  window.applyState = function (state) {
    if (state.scrollEnabled === false) { map.dragging.disable(); } else { map.dragging.enable(); }
    if (state.zoomEnabled === false) {
      map.touchZoom.disable(); map.doubleClickZoom.disable(); map.scrollWheelZoom.disable();
    } else {
      map.touchZoom.enable(); map.doubleClickZoom.enable(); map.scrollWheelZoom.enable();
    }

    if (state.center) {
      muteMoveEvent = true;
      map.setView([state.center.lat, state.center.lng], state.center.zoom, { animate: false });
    }

    markerLayer.clearLayers();
    (state.markers || []).forEach(function (m) {
      var mk = L.marker([m.lat, m.lng], {
        icon: pinIcon(m.selected ? '#15803d' : '#22c55e', m.selected),
        zIndexOffset: m.selected ? 1000 : 0,
        title: m.title || ''
      });
      mk.on('click', function (e) {
        if (e.originalEvent) { L.DomEvent.stopPropagation(e); }
        send({ type: 'markerPress', index: m.index });
      });
      mk.addTo(markerLayer);
    });

    if (circleLayer) { map.removeLayer(circleLayer); circleLayer = null; }
    if (state.circle) {
      circleLayer = L.circle([state.circle.lat, state.circle.lng], {
        radius: state.circle.radius,
        color: state.circle.stroke,
        weight: 1.5,
        fillColor: state.circle.fill,
        fillOpacity: 0.12
      }).addTo(map);
    }

    if (userLayer) { map.removeLayer(userLayer); userLayer = null; }
    if (state.user) {
      userLayer = L.marker([state.user.lat, state.user.lng], {
        icon: L.divIcon({ className: '', html: '<div class="dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false
      }).addTo(map);
    }
  };

  window.flyTo = function (lat, lng, zoom, seconds) {
    muteMoveEvent = true;
    map.flyTo([lat, lng], zoom, { duration: seconds });
  };

  send({ type: 'ready' });
</script>
</body>
</html>`;

const OsmMap = forwardRef<OsmMapHandle, OsmMapProps>(function OsmMap(props, ref) {
  const {
    style,
    initialRegion,
    region,
    userLocation,
    onPress,
    onRegionChangeComplete,
    scrollEnabled,
    zoomEnabled,
    children,
  } = props;

  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  /*
   * อ่านหมุดและวงกลมออกมาจาก children
   *
   * children เป็น <OsmMarker> / <OsmCircle> ที่คืนค่า null
   * เราจึงต้องมาแกะ props ของมันเองเพื่อส่งเข้าไปวาดใน WebView
   * Children.forEach คลี่ array กับ fragment ให้เองอยู่แล้ว ({stores.map(...)} จึงใช้ได้
   */
  const markerPressHandlers = useRef<Array<(() => void) | undefined>>([]);

  const { markers, circle } = useMemo(() => {
    const list: MarkerSpec[] = [];
    const handlers: Array<(() => void) | undefined> = [];
    let found: CircleSpec | null = null;

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;

      if (child.type === OsmMarker) {
        const p = child.props as OsmMarkerProps;
        const lat = Number(p.coordinate.latitude);
        const lng = Number(p.coordinate.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        list.push({
          index: list.length,
          lat,
          lng,
          title: p.title ?? '',
          selected: p.selected === true,
        });
        handlers.push(p.onPress);
        return;
      }

      if (child.type === OsmCircle) {
        const p = child.props as OsmCircleProps;
        found = {
          lat: Number(p.center.latitude),
          lng: Number(p.center.longitude),
          radius: p.radius,
          stroke: p.strokeColor ?? theme.colors.primary,
          fill: p.fillColor ?? theme.colors.primary,
        };
      }
    });

    markerPressHandlers.current = handlers;
    return { markers: list, circle: found as CircleSpec | null };
  }, [children]);

  /** ก้อนข้อมูลที่จะยิงเข้าไปในแผนที่ */
  const stateJson = useMemo(() => {
    const target = region ?? initialRegion;
    return JSON.stringify({
      scrollEnabled: scrollEnabled !== false,
      zoomEnabled: zoomEnabled !== false,
      /*
       * เลื่อนแผนที่ตามค่าที่ส่งมา เฉพาะตอนที่หน้าจอเป็นคนกำหนด (region)
       * หรือตอนเปิดครั้งแรก (initialRegion) เท่านั้น
       * ถ้าสั่งทุกครั้งที่ re-render ผู้ใช้จะเลื่อนแผนที่เองไม่ได้เลย เพราะโดนดีดกลับตลอด
       */
      center: target === undefined ? null : {
        lat: target.latitude,
        lng: target.longitude,
        zoom: deltaToZoom(target.longitudeDelta || target.latitudeDelta),
      },
      markers,
      circle,
      user: userLocation === null || userLocation === undefined
        ? null
        : { lat: userLocation.latitude, lng: userLocation.longitude },
    });
  }, [region, initialRegion, scrollEnabled, zoomEnabled, markers, circle, userLocation]);

  /*
   * ส่งข้อมูลเข้าไปทุกครั้งที่ค่าเปลี่ยน
   *
   * ใช้ injectJavaScript แทนการ re-render WebView
   * เพราะถ้าสร้าง WebView ใหม่ แผนที่จะกระพริบและซูมกลับไปที่เดิมทุกครั้ง
   */
  if (ready) {
    webRef.current?.injectJavaScript(`window.applyState(${stateJson}); true;`);
  }

  useImperativeHandle(ref, () => ({
    animateToRegion(target: Region, duration = 400): void {
      const zoom = deltaToZoom(target.longitudeDelta || target.latitudeDelta);
      webRef.current?.injectJavaScript(
        `window.flyTo(${target.latitude}, ${target.longitude}, ${zoom}, ${duration / 1000}); true;`
      );
    },
  }), []);

  const handleMessage = useCallback((event: WebViewMessageEvent): void => {
    let data: IncomingMessage;
    try {
      data = JSON.parse(event.nativeEvent.data) as IncomingMessage;
    } catch {
      return;
    }

    if (data.type === 'ready') {
      setReady(true);
      webRef.current?.injectJavaScript(`window.applyState(${stateJson}); true;`);
      return;
    }

    if (data.type === 'press') {
      onPress?.();
      return;
    }

    if (data.type === 'markerPress' && typeof data.index === 'number') {
      markerPressHandlers.current[data.index]?.();
      return;
    }

    if (data.type === 'regionChange' && onRegionChangeComplete !== undefined) {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = data;
      if (
        typeof latitude === 'number' && typeof longitude === 'number'
        && typeof latitudeDelta === 'number' && typeof longitudeDelta === 'number'
      ) {
        onRegionChangeComplete({ latitude, longitude, latitudeDelta, longitudeDelta });
      }
    }
  }, [onPress, onRegionChangeComplete, stateJson]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html: MAP_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        style={styles.web}
        /* กันไม่ให้ WebView แย่งการเลื่อนหน้าจอไปจากฟอร์มที่อยู่รอบ ๆ */
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        /* หน้าเว็บนี้เราสร้างเอง ไม่ให้เปิดลิงก์ออกไปไหนทั้งสิ้น */
        setSupportMultipleWindows={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#e8eef3' },
  web: { flex: 1, backgroundColor: 'transparent' },
});

export default OsmMap;
