/**
 * รายละเอียดการจอง
 *
 * *** หน้านี้ถูกเปิดได้จากทั้งสองฝั่ง ***
 *   ลูกค้า : เปิดจากแท็บ "การจอง" เพื่อดู QR ซ้ำ / ยกเลิก / เขียนรีวิว
 *   ร้าน   : เปิดจากรายการจองของร้าน เพื่อดูว่าใครจองอะไร (ดูอย่างเดียว)
 *
 * จึงใช้ AppStackParamList (ครอบทั้งสอง stack) และซ่อนปุ่มของลูกค้าเมื่อ isSeller
 *
 * *** QR วาดจาก qr_payload ที่ Backend ส่งมา แอปไม่ได้สร้างเองและไม่ได้ตรวจเอง ***
 */
import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import type { ReservationDetail } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';
import AppButton from '../../../components/AppButton';
import StatusBadge from '../../../components/StatusBadge';
import StoreMapCard from '../../../components/StoreMapCard';

import reservationService from '../reservationService';
import { errorMessage } from '../../../core/services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { imageUrl } from '../../../core/constants/apiConstants';
import useCountdown from '../../../core/hooks/useCountdown';
import { formatPrice, formatPickupRange, formatDateTime } from '../../../core/utils/formatters';
import { theme } from '../../../core/theme/theme';
import type { AppStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ReservationDetail'>;

export default function ReservationDetailScreen({ route, navigation }: Props): JSX.Element {
  const { reservationId } = route.params;
  const { isSeller } = useAuth();

  const [item, setItem] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * ตัวนับถอยหลังต้องเรียกตรงนี้เสมอ ห้ามเอาไปไว้หลัง if (loading) return
   * เพราะกฎของ React Hooks คือทุกครั้งที่ render ต้องเรียก hook ชุดเดิมตามลำดับเดิม
   * ตอน item ยังเป็น null ก็ส่ง null ไป hook จัดการให้เองว่าไม่ต้องนับ
   */
  const timer = useCountdown(item?.expires_at ?? null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setItem(await reservationService.getById(reservationId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [reservationId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmCancel(): void {
    Alert.alert(
      'ยกเลิกการจอง',
      'ยกเลิกแล้วอาหารจะถูกคืนเข้าโพสต์ให้คนอื่นจองต่อ และยกเลิกบ่อยจะกระทบคะแนนพฤติกรรมของคุณ',
      [
        { text: 'ไม่ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยันยกเลิก',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setCancelling(true);
              try {
                setItem(await reservationService.cancel(reservationId));
              } catch (err) {
                Alert.alert('ยกเลิกไม่สำเร็จ', errorMessage(err));
              }
              setCancelling(false);
            })();
          },
        },
      ]
    );
  }

  /**
   * โทรหาร้าน
   * ปล่อยให้ระบบปฏิบัติการเปิดแอปโทรศัพท์ให้ ไม่ได้โทรเอง
   */
  async function callStore(phone: string): Promise<void> {
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (!canOpen) {
      Alert.alert('โทรออกไม่ได้', `กรุณาโทรหาร้านที่เบอร์ ${phone} ด้วยตัวเอง`);
      return;
    }
    await Linking.openURL(url);
  }

  if (loading) {
    return <LoadingView message="กำลังโหลดการจอง..." />;
  }

  if (item === null) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="cloud-offline-outline"
          title="เปิดการจองนี้ไม่ได้"
          message={error ?? 'ไม่พบข้อมูลการจอง'}
          actionLabel="ลองใหม่"
          onAction={() => void handleRefresh()}
        />
      </ScreenContainer>
    );
  }

  /*
   * *** รูปร้านกับรูปอาหารคนละไฟล์กัน ***
   * เดิมบรรทัดนี้เขียนว่า imageUrl(item.image, 'store') คือเอาชื่อไฟล์ "รูปอาหาร"
   * ไปเปิดในโฟลเดอร์ "store" ซึ่งไม่มีไฟล์นั้นอยู่ เซิร์ฟเวอร์จึงตอบ 404 ทุกครั้ง
   * (เห็นในหน้าต่าง cmd ของ backend ว่า GET /uploads/store/...png 404)
   * ตอนนี้ Backend ส่ง store_image มาให้แยกต่างหากแล้ว
   */
  const storeImage = imageUrl(item.store_image, 'store');
  const foodImage = imageUrl(item.image, 'food');

  /** ร้านปักหมุดไว้หรือยัง ถ้ายังก็ไม่ต้องมีปุ่มเปิดแผนที่เต็มจอ */
  const hasLocation = item.latitude !== null && item.longitude !== null;

  // ส่วนลดกี่เปอร์เซ็นต์ ใช้โชว์ป้ายแดงบนการ์ดอาหาร
  const normal = Number(item.normal_price);
  const paid = Number(item.unit_price);
  const discountPercent = normal > paid && normal > 0
    ? Math.round(((normal - paid) / normal) * 100)
    : 0;

  // QR ใช้ได้เฉพาะตอนที่ยังต้องไปรับเท่านั้น
  const showQr = !isSeller && (item.status === 'confirmed' || item.status === 'waiting');
  const canCancel = !isSeller && (item.status === 'confirmed' || item.status === 'waiting');
  const canReview = !isSeller && item.status === 'completed' && item.has_review === 0;

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
        }
      >
        {/* ---- การ์ดร้าน + ปุ่มโทร ---- */}
        {!isSeller ? (
          <View style={styles.storeCard}>
            {storeImage !== null ? (
              <Image source={{ uri: storeImage }} style={styles.storeThumb} />
            ) : (
              <View style={[styles.storeThumb, styles.storeThumbEmpty]}>
                <Ionicons name="storefront" size={26} color={theme.colors.textMuted} />
              </View>
            )}

            <View style={styles.storeInfo}>
              <Text style={styles.storeName} numberOfLines={1}>{item.store_name}</Text>
              <Text style={styles.storeAddress} numberOfLines={1}>
                {item.store_address ?? 'ไม่ระบุที่อยู่'}
              </Text>
            </View>

            {item.store_phone !== null ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => { void callStore(item.store_phone as string); }}
              >
                <Ionicons name="call-outline" size={14} color={theme.colors.primaryDark} />
                <Text style={styles.callText}>โทรร้านค้า</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* ---- หมายเลขคิว + สถานะ ---- */}
        <View style={styles.queueCard}>
          <View>
            <Text style={styles.queueLabel}>หมายเลขคิว</Text>
            <Text style={styles.queueCode}>{item.reservation_code}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* ---- QR (เฉพาะลูกค้า และเฉพาะที่ยังไม่รับ) ---- */}
        {showQr ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrHeading}>กรุณาแสดง QR Code นี้ที่ร้านค้า</Text>

            {/* ---- นับถอยหลังแบบเรียลไทม์ ---- */}
            <View style={[styles.timerBox, timer.isUrgent ? styles.timerBoxUrgent : null]}>
              <Ionicons
                name={timer.isExpired ? 'close-circle-outline' : 'time-outline'}
                size={18}
                color={timer.isUrgent || timer.isExpired ? theme.colors.error : theme.colors.primaryDark}
              />
              {timer.isExpired ? (
                <Text style={[styles.timerText, styles.timerTextUrgent]}>คิวหมดเวลาแล้ว</Text>
              ) : (
                <Text style={[styles.timerText, timer.isUrgent ? styles.timerTextUrgent : null]}>
                  เหลือเวลาอีก {timer.text}
                </Text>
              )}
            </View>

            <View style={styles.qrBox}>
              <QRCode
                value={item.qr_payload}
                size={190}
                color={theme.colors.textPrimary}
                backgroundColor={theme.colors.surface}
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>หรือบอกรหัสนี้กับร้าน</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.codeRow}>
              {item.reservation_code.split('').map((digit, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <View key={`${digit}-${index}`} style={styles.codeBox}>
                  <Text style={styles.codeDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.expire}>
              คิวของคุณมีผลถึง {formatPickupRange(item.pickup_start, item.expires_at).split(' - ')[1] ?? ''} น.
            </Text>
          </View>
        ) : null}

        {/* ---- รายการอาหาร ---- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>รายการอาหาร</Text>

          <View style={styles.foodRow}>
            {foodImage !== null ? (
              <Image source={{ uri: foodImage }} style={styles.foodThumb} />
            ) : (
              <View style={[styles.foodThumb, styles.storeThumbEmpty]}>
                <Ionicons name="fast-food-outline" size={24} color={theme.colors.textMuted} />
              </View>
            )}

            <View style={styles.foodInfo}>
              <Text style={styles.foodName} numberOfLines={2}>{item.food_name}</Text>
              <Text style={styles.foodQty}>{item.quantity} กล่อง</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceNow}>{formatPrice(item.unit_price)}</Text>
                {Number(item.normal_price) > Number(item.unit_price) ? (
                  <Text style={styles.priceOld}>{formatPrice(item.normal_price)}</Text>
                ) : null}
              </View>
            </View>

            {discountPercent > 0 ? (
              <Text style={styles.discountBadge}>-{discountPercent}%</Text>
            ) : null}
          </View>
        </View>

        {/* ---- สรุปการจอง ---- */}
        <View style={styles.card}>
          <Row label="วันที่จอง" value={formatDateTime(item.created_at)} />
          <Row label="เวลารับสินค้า" value={formatPickupRange(item.pickup_start, item.pickup_end)} />
          <Row label="จำนวน" value={`${item.quantity} รายการ`} />
          <Row label="ยอดรวม" value={formatPrice(item.total_price)} highlight />
        </View>

        {/* ---- ช่องทางชำระเงิน ----
            ตอนนี้มีทางเดียวคือจ่ายที่ร้าน ระบบไม่ได้รับเงินแทนร้าน
            แสดงไว้ให้ลูกค้ารู้ว่าต้องเตรียมเงินไป ไม่ใช่จ่ายในแอป */}
        <View style={styles.card}>
          <Text style={styles.payLabel}>การชำระเงิน</Text>
          <Text style={styles.payValue}>ชำระที่ร้าน (Pay at Store)</Text>
        </View>

        {/* ---- ข้อมูลร้าน (ลูกค้าดู) / ข้อมูลลูกค้า (ร้านดู) ---- */}
        {isSeller ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ผู้จอง</Text>
            <Row label="ชื่อ" value={item.customer_name} />
            {item.customer_phone !== null ? (
              <Row label="เบอร์โทร" value={item.customer_phone} />
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ร้านที่ไปรับ</Text>
              <Row label="ชื่อร้าน" value={item.store_name} />
              {item.store_address !== null ? <Row label="ที่อยู่" value={item.store_address} /> : null}
              {item.store_phone !== null ? <Row label="เบอร์ร้าน" value={item.store_phone} /> : null}
            </View>

            {/*
              ---- แผนที่ร้าน ----
              ที่อยู่แบบตัวหนังสือบอกได้แค่ว่า "ที่ไหน" แต่ไม่ได้บอกว่า "ไปยังไง"
              โดยเฉพาะที่อยู่หอพัก/ซอย ที่อ่านครบแล้วก็ยังหาไม่เจอ
              หน้านี้เปิดตอนกำลังจะออกไปรับของ แผนที่จึงเป็นสิ่งที่ต้องการที่สุด
            */}
            <StoreMapCard
              storeName={item.store_name}
              address={item.store_address}
              latitude={item.latitude}
              longitude={item.longitude}
              onPress={() => {
                if (!hasLocation) return;
                navigation.navigate('StoreLocation', {
                  storeName: item.store_name,
                  address: item.store_address,
                  latitude: Number(item.latitude),
                  longitude: Number(item.longitude),
                });
              }}
            />
          </>
        )}

        {/* ---- เวลาที่เกิดขึ้นแล้ว (โชว์เฉพาะที่มีจริง) ---- */}
        {item.completed_at !== null || item.cancelled_at !== null ? (
          <View style={styles.card}>
            {item.completed_at !== null ? (
              <Row label="รับอาหารเมื่อ" value={formatDateTime(item.completed_at)} />
            ) : null}
            {item.cancelled_at !== null ? (
              <Row label="ยกเลิกเมื่อ" value={formatDateTime(item.cancelled_at)} />
            ) : null}
          </View>
        ) : null}

        {/* ---- เตือนเรื่องเงินสด ---- */}
        {showQr ? (
          <View style={styles.noticeBox}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.warningText} />
            <Text style={styles.noticeText}>
              ชำระเงินสดที่ร้าน {formatPrice(item.total_price)}
            </Text>
          </View>
        ) : null}

        {/* ---- ปุ่มของลูกค้า ---- */}
        {canReview ? (
          <AppButton
            title="เขียนรีวิวร้านนี้"
            icon={<Ionicons name="star-outline" size={19} color={theme.colors.textOnPrimary} />}
            onPress={() =>
              navigation.navigate('WriteReview', {
                reservationId: item.reservation_id,
                storeName: item.store_name,
              })
            }
          />
        ) : null}

        {canCancel ? (
          <AppButton
            title="ยกเลิกการจอง"
            variant="outline"
            loading={cancelling}
            onPress={confirmCancel}
            style={{ marginTop: theme.spacing.sm }}
          />
        ) : null}

        {/* ---- แจ้งปัญหา ----
            ทั้งลูกค้าและร้านแจ้งการจองนี้ได้ (Backend เช็คให้ว่าเกี่ยวข้องจริง)
            เช่น ลูกค้าไปถึงแล้วไม่ได้ของ หรือร้านเจอลูกค้าที่จองแล้วไม่มา */}
        <TouchableOpacity
          style={styles.reportButton}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('Report', {
              targetType: 'reservation',
              targetId: item.reservation_id,
              targetName: `${item.food_name} จาก ${item.store_name}`,
            })
          }
        >
          <Ionicons name="flag-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.reportText}>แจ้งปัญหาเกี่ยวกับการจองนี้</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function Row({ label, value, highlight = false }: RowProps): JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight ? styles.detailValueHighlight : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  orderNo: { ...theme.textStyles.caption },

  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  storeThumb: {
    width: 56, height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  storeThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1 },
  storeName: { ...theme.textStyles.subheading },
  storeAddress: { ...theme.textStyles.caption, marginTop: 1 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  callText: { ...theme.textStyles.caption, color: theme.colors.primaryDark },

  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  queueLabel: { ...theme.textStyles.caption },
  queueCode: {
    fontSize: 30,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primaryDark,
    letterSpacing: 1,
  },

  qrHeading: { ...theme.textStyles.body, marginBottom: theme.spacing.sm },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySurface,
    marginBottom: theme.spacing.md,
  },
  timerBoxUrgent: { backgroundColor: theme.colors.errorBg },
  timerText: {
    ...theme.textStyles.subheading,
    color: theme.colors.primaryDark,
    // ใช้ตัวเลขความกว้างเท่ากัน เลขจะได้ไม่ขยับซ้ายขวาตอนนับถอยหลัง
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: { color: theme.colors.error },

  foodRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  foodThumb: {
    width: 60, height: 60,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  foodInfo: { flex: 1 },
  foodName: { ...theme.textStyles.body },
  foodQty: { ...theme.textStyles.caption, marginTop: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, marginTop: 2 },
  priceNow: {
    ...theme.textStyles.subheading,
    color: theme.colors.error,
  },
  priceOld: {
    ...theme.textStyles.caption,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    ...theme.textStyles.subheading,
    color: theme.colors.error,
  },

  payLabel: { ...theme.textStyles.caption },
  payValue: { ...theme.textStyles.body, marginTop: 2 },

  qrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  qrBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    alignSelf: 'stretch',
  },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { ...theme.textStyles.caption },

  codeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  codeBox: {
    width: 46,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    fontSize: 26,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primaryDark,
  },
  expire: { ...theme.textStyles.caption, marginTop: theme.spacing.sm },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionTitle: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: 5,
  },
  detailLabel: { ...theme.textStyles.caption },
  detailValue: { ...theme.textStyles.body, flex: 1, textAlign: 'right' },
  detailValueHighlight: {
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.semiBold,
  },

  noticeBox: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  noticeText: { ...theme.textStyles.caption, color: theme.colors.warningText, flex: 1 },

  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  reportText: { ...theme.textStyles.caption },
});
