/**
 * สแกน QR Code ของลูกค้า
 *
 * ==========================================================
 *  *** กฎเหล็กข้อ 4 : QR ต้องผ่าน Backend ทุกครั้ง ***
 * ==========================================================
 * แอปทำหน้าที่แค่ "อ่านข้อความจาก QR" แล้วส่งไปให้ Backend ตรวจ
 * ห้ามให้แอปตัดสินเองเด็ดขาดว่า QR ถูกต้องหรือไม่
 *
 * เพราะถ้าให้แอปตัดสิน
 *   1. ใครก็สร้าง QR ปลอมได้ แค่รู้รูปแบบข้อความ
 *   2. ลูกค้าเก็บ QR เดิมไว้ใช้ซ้ำได้เรื่อย ๆ
 *
 * Backend ตรวจให้ 5 ด่าน : แกะ token ได้ไหม / มีในระบบไหม /
 * เป็นของร้านนี้ไหม / ถูกใช้ไปแล้วหรือยัง / หมดอายุหรือยัง
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenContainer from '../../components/ScreenContainer';
import AppButton from '../../components/AppButton';
import LoadingView from '../../components/LoadingView';
import VerifyResultView from './VerifyResultView';
import type { VerifyResult } from './VerifyResultView';

import reservationService from '../../features/reservation/reservationService';
import { errorMessage } from '../../core/services/apiClient';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

export default function ScanQrScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [permission, requestPermission] = useCameraPermissions();

  /** กันสแกนซ้ำรัว ๆ กล้องยิง event ได้หลายสิบครั้งต่อวินาที */
  const [scanned, setScanned] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function handleScan(data: string): Promise<void> {
    if (scanned) return;
    setScanned(true);
    setChecking(true);

    try {
      // *** ส่งไปให้ Backend ตัดสิน ไม่ตัดสินเอง ***
      const reservation = await reservationService.verify({ qrPayload: data });
      setResult({ ok: true, message: 'รับอาหารเรียบร้อยแล้ว', reservation });
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err) });
    } finally {
      setChecking(false);
    }
  }

  function scanAgain(): void {
    setResult(null);
    setScanned(false);
  }

  // ---- ยังไม่รู้สถานะสิทธิ์กล้อง ----
  if (permission === null) {
    return <ScreenContainer><LoadingView message="กำลังเตรียมกล้อง..." /></ScreenContainer>;
  }

  // ---- ยังไม่ได้อนุญาตให้ใช้กล้อง ----
  if (!permission.granted) {
    return (
      <ScreenContainer scroll>
        <View style={styles.permissionWrap}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={44} color={theme.colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>ต้องขออนุญาตใช้กล้อง</Text>
          <Text style={styles.permissionText}>
            SaveEats ใช้กล้องเพื่อสแกน QR Code ของลูกค้าเท่านั้น
            {'\n'}ไม่มีการเก็บภาพหรือส่งภาพไปที่ไหน
          </Text>

          <AppButton
            title="อนุญาตใช้กล้อง"
            onPress={() => { void requestPermission(); }}
            style={{ marginTop: theme.spacing.lg }}
          />
          <AppButton
            title="กรอกรหัส 4 หลักแทน"
            variant="outline"
            onPress={() => navigation.navigate('SellerEnterCode')}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      </ScreenContainer>
    );
  }

  // ---- กำลังตรวจกับ Backend ----
  if (checking) {
    return <ScreenContainer><LoadingView message="กำลังตรวจสอบกับระบบ..." /></ScreenContainer>;
  }

  // ---- มีผลลัพธ์แล้ว ----
  if (result !== null) {
    return (
      <ScreenContainer padded={false}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <VerifyResultView
            result={result}
            onAgain={scanAgain}
            onClose={() => navigation.goBack()}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ---- หน้ากล้อง ----
  return (
    <View style={styles.cameraWrapper}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : ({ data }) => { void handleScan(data); }}
      />

      {/* ---- กรอบเล็งให้ผู้ใช้รู้ว่าต้องส่องตรงไหน ---- */}
      <View style={styles.overlay}>
        <Text style={styles.hintTop}>เล็งกล้องไปที่ QR Code บนมือถือลูกค้า</Text>

        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => navigation.navigate('SellerEnterCode')}
        >
          <Ionicons name="keypad-outline" size={20} color={theme.colors.textOnPrimary} />
          <Text style={styles.manualText}>สแกนไม่ได้ กรอกรหัส 4 หลักแทน</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME_SIZE = 240;
const CORNER = 34;

const styles = StyleSheet.create({
  cameraWrapper: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTop: {
    ...theme.textStyles.body,
    color: theme.colors.textOnPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: theme.colors.primary,
  },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },

  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.pill,
  },
  manualText: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.textOnPrimary,
    marginLeft: theme.spacing.sm,
  },

  permissionWrap: { alignItems: 'center', paddingVertical: theme.spacing.xl },
  permissionIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  permissionTitle: { ...theme.textStyles.heading, textAlign: 'center' },
  permissionText: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },

  resultScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: theme.spacing.lg },
});
