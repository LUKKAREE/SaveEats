/**
 * แก้ไขข้อมูลร้าน (ใช้ได้จริงแล้ว)
 *
 * *** การปักหมุดสำคัญกว่าที่คิด ***
 * ถ้าร้านไม่ปักหมุด ลูกค้าจะหาร้านบนแผนที่ไม่เจอเลย และไม่เห็นระยะทางใน Feed
 * แต่การให้ร้านพิมพ์ละติจูด/ลองจิจูดเองเป็นเรื่องที่คนทั่วไปทำไม่ได้
 *
 * จึงมีให้เลือก 2 ทาง
 *   1. เลือกบนแผนที่ - เลื่อนแผนที่เอง ใช้ได้จากทุกที่ แก้ไขได้ตลอด
 *   2. ใช้ตำแหน่งปัจจุบัน - ทางลัดสำหรับคนที่ยืนอยู่ที่ร้านพอดี
 *
 * *** ทำไมต้องมีทางที่ 1 ***
 * เจ้าของร้านส่วนใหญ่สมัครตอนกลางคืนที่บ้าน หลังปิดร้านแล้ว ไม่ได้อยู่ที่ร้าน
 * และ GPS ในอาคารคลาดได้ 50-100 เมตร กดปุ่มตอนอยู่ที่ร้านจริงก็ยังพลาดได้
 * ถ้ามีแต่ทางที่ 2 พอปักผิดจะแก้ไม่ได้เลย นอกจากเดินทางกลับไปที่ร้าน
 *
 * API : GET /api/stores/me  แล้ว  PUT /api/stores/me
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OsmMap, { OsmMarker } from '../../components/OsmMap';
import type { UpdateStoreRequest } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import AppTextInput from '../../components/AppTextInput';
import AppButton from '../../components/AppButton';
import FormSection from '../../components/FormSection';
import ImagePickerField from '../../components/ImagePickerField';
import LoadingView from '../../components/LoadingView';

import storeService from '../services/storeService';
import { useAuth } from '../../context/AuthContext';
import locationService from '../../core/services/locationService';
import { errorMessage } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import { imageUrl } from '../../core/constants/apiConstants';
import { theme } from '../../core/theme/theme';
import type { SellerScreenProps } from '../../navigation/types';

type Props = SellerScreenProps<'SellerEditStore'>;

/** รูปแบบเวลา HH:MM (24 ชั่วโมง) */
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export default function SellerEditStoreScreen({ route, navigation }: Props): JSX.Element {
  const { refresh } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [image, setImage] = useState<PickedImage | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  /*
   * รับพิกัดที่เลือกมาจากหน้าแผนที่
   *
   * *** ต้องเคลียร์ params ทิ้งหลังใช้เสร็จ ***
   * ถ้าไม่เคลียร์ ค่าเดิมจะค้างอยู่ใน route
   * พอผู้ใช้กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" ทีหลัง useEffect นี้อาจทำงานอีกรอบ
   * แล้วเขียนทับพิกัดใหม่ด้วยค่าเก่า ซึ่งหาสาเหตุยากมาก
   */
  const picked = route.params?.pickedLocation;
  useEffect(() => {
    if (picked === undefined) return;
    setLatitude(picked.latitude);
    setLongitude(picked.longitude);
    navigation.setParams({ pickedLocation: undefined });
  }, [picked, navigation]);

  // โหลดข้อมูลเดิมมาใส่ในฟอร์ม
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { store } = await storeService.getMyStore();
        if (!active) return;
        setStoreName(store.store_name);
        setDescription(store.description ?? '');
        setAddress(store.address ?? '');
        setPhone(store.phone ?? '');
        setOpenTime(store.open_time?.slice(0, 5) ?? '');
        setCloseTime(store.close_time?.slice(0, 5) ?? '');
        setLatitude(store.latitude === null ? null : Number(store.latitude));
        setLongitude(store.longitude === null ? null : Number(store.longitude));
        setCurrentImage(imageUrl(store.image, 'store'));
      } catch (err) {
        if (active) setServerError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleUseCurrentLocation(): Promise<void> {
    setGettingLocation(true);
    const coords = await locationService.getCurrentPosition().catch(() => null);
    setGettingLocation(false);

    if (coords === null) {
      Alert.alert(
        'ดึงตำแหน่งไม่สำเร็จ',
        'กรุณาเปิด GPS และอนุญาตให้แอปเข้าถึงตำแหน่ง แล้วลองกดใหม่อีกครั้ง'
      );
      return;
    }

    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
    Alert.alert('ปักหมุดแล้ว', 'บันทึกตำแหน่งปัจจุบันเป็นที่ตั้งร้านเรียบร้อย อย่าลืมกดบันทึกข้อมูล');
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (storeName.trim() === '') next['storeName'] = 'กรุณากรอกชื่อร้าน';

    if (phone.trim() !== '' && !/^[0-9]{9,10}$/.test(phone.trim())) {
      next['phone'] = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก';
    }

    // เวลาไม่บังคับ แต่ถ้าใส่มาต้องถูกรูปแบบ และต้องใส่ครบทั้งคู่
    if (openTime.trim() !== '' && !TIME_PATTERN.test(openTime.trim())) {
      next['openTime'] = 'ใส่เป็นรูปแบบ HH:MM เช่น 08:00';
    }
    if (closeTime.trim() !== '' && !TIME_PATTERN.test(closeTime.trim())) {
      next['closeTime'] = 'ใส่เป็นรูปแบบ HH:MM เช่น 20:00';
    }
    if (openTime.trim() !== '' && closeTime.trim() === '') {
      next['closeTime'] = 'ใส่เวลาเปิดแล้ว ต้องใส่เวลาปิดด้วย';
    }
    if (closeTime.trim() !== '' && openTime.trim() === '') {
      next['openTime'] = 'ใส่เวลาปิดแล้ว ต้องใส่เวลาเปิดด้วย';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(): Promise<void> {
    if (!validate()) return;

    setSaving(true);
    setServerError(null);
    try {
      const body: UpdateStoreRequest = {
        storeName: storeName.trim(),
        description: description.trim(),
        address: address.trim(),
        phone: phone.trim(),
        ...(openTime.trim() !== '' ? { openTime: `${openTime.trim()}:00` } : {}),
        ...(closeTime.trim() !== '' ? { closeTime: `${closeTime.trim()}:00` } : {}),
        ...(latitude !== null ? { latitude } : {}),
        ...(longitude !== null ? { longitude } : {}),
      };

      await storeService.updateMyStore(body, image);

      /*
       * ดึงข้อมูลใหม่เข้า Context ด้วย
       *
       * *** ถ้าไม่ทำ ร้านจะเห็นรูปเดิมค้างอยู่ ***
       * รูปร้านถูกเอาไปใช้เป็นไอคอนในหน้าโปรไฟล์
       * ซึ่งอ่านค่าจาก Context ไม่ได้อ่านจากเซิร์ฟเวอร์ใหม่ทุกครั้ง
       * บันทึกแล้วแต่รูปไม่เปลี่ยน ร้านจะนึกว่าระบบไม่ได้บันทึกให้
       */
      await refresh();

      Alert.alert('บันทึกแล้ว', 'ข้อมูลร้านของคุณถูกอัปเดตเรียบร้อย', [
        { text: 'ตกลง', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView message="กำลังโหลดข้อมูลร้าน..." />;

  const hasPin = latitude !== null && longitude !== null;

  return (
    <ScreenContainer padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FormSection title="รูปหน้าร้าน" hint="รูปแรกที่ลูกค้าเห็น ควรเป็นรูปหน้าร้านจริง">
            <ImagePickerField
              value={image}
              currentImageUrl={currentImage}
              onChange={setImage}
              label="เลือกรูปหน้าร้าน"
            />
          </FormSection>

          <FormSection title="ข้อมูลร้าน">
            <AppTextInput
              label="ชื่อร้าน"
              value={storeName}
              onChangeText={setStoreName}
              placeholder="เช่น ครัวคุณแม่"
              error={errors['storeName']}
            />
            <AppTextInput
              label="คำอธิบายร้าน"
              value={description}
              onChangeText={setDescription}
              placeholder="เล่าสั้น ๆ ว่าร้านขายอะไร เด่นเรื่องอะไร"
              multiline
              maxLength={300}
            />
            <AppTextInput
              label="เบอร์โทรร้าน"
              value={phone}
              onChangeText={setPhone}
              placeholder="0812345678"
              keyboardType="phone-pad"
              error={errors['phone']}
              helperText="ลูกค้ากดโทรหาร้านได้จากหน้ารายละเอียดร้าน"
            />
          </FormSection>

          <FormSection title="เวลาเปิด-ปิด" hint="ใส่เป็นรูปแบบ HH:MM แบบ 24 ชั่วโมง">
            <View style={styles.timeRow}>
              <AppTextInput
                label="เปิด"
                value={openTime}
                onChangeText={setOpenTime}
                placeholder="08:00"
                keyboardType="numbers-and-punctuation"
                error={errors['openTime']}
                maxLength={5}
                style={{ flex: 1 }}
              />
              <AppTextInput
                label="ปิด"
                value={closeTime}
                onChangeText={setCloseTime}
                placeholder="20:00"
                keyboardType="numbers-and-punctuation"
                error={errors['closeTime']}
                maxLength={5}
                style={{ flex: 1 }}
              />
            </View>
          </FormSection>

          <FormSection title="ที่ตั้งร้าน">
            <AppTextInput
              label="ที่อยู่"
              value={address}
              onChangeText={setAddress}
              placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด"
              multiline
            />

            {/* ---- ปักหมุด ---- */}
            <View style={[styles.pinBox, hasPin ? styles.pinBoxDone : null]}>
              <Ionicons
                name={hasPin ? 'checkmark-circle' : 'alert-circle-outline'}
                size={20}
                color={hasPin ? theme.colors.success : theme.colors.warningText}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.pinTitle}>
                  {hasPin ? 'ปักหมุดตำแหน่งร้านแล้ว' : 'ยังไม่ได้ปักหมุดตำแหน่งร้าน'}
                </Text>
                <Text style={styles.pinHint}>
                  {hasPin
                    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                    : 'ถ้าไม่ปักหมุด ลูกค้าจะหาร้านบนแผนที่ไม่เจอ และไม่เห็นระยะทาง'}
                </Text>
              </View>
            </View>

            {/*
              ---- แผนที่ตัวอย่าง ----
              แสดงเฉพาะตอนปักหมุดแล้ว เพื่อให้เห็นด้วยตาว่าหมุดไปตกตรงไหน
              เดิมโชว์แค่ตัวเลขพิกัด ซึ่งคนทั่วไปดูไม่ออกว่าถูกหรือผิด

              pointerEvents="none" กันไม่ให้เลื่อนแผนที่เล็กนี้
              เพราะมันอยู่ในฟอร์มที่เลื่อนขึ้นลงได้ ถ้าแตะโดนจะแย่งการเลื่อนกัน
              อยากแก้ตำแหน่งให้กดปุ่มข้างล่างเพื่อเปิดแผนที่เต็มจอแทน
            */}
            {hasPin ? (
              <View style={styles.mapPreview} pointerEvents="none">
                <OsmMap
                  style={StyleSheet.absoluteFill}
                  region={{
                    latitude: latitude as number,
                    longitude: longitude as number,
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <OsmMarker
                    coordinate={{ latitude: latitude as number, longitude: longitude as number }}
                  />
                </OsmMap>
              </View>
            ) : null}

            <AppButton
              title={hasPin ? 'แก้ไขตำแหน่งบนแผนที่' : 'เลือกตำแหน่งบนแผนที่'}
              icon={<Ionicons name="map-outline" size={18} color={theme.colors.textOnPrimary} />}
              onPress={() => navigation.navigate('SellerPickLocation', {
                // ส่งพิกัดเดิมไปด้วย แผนที่จะได้เปิดตรงจุดนั้นเลย ไม่ต้องเลื่อนหาใหม่
                ...(hasPin
                  ? { initial: { latitude: latitude as number, longitude: longitude as number } }
                  : {}),
              })}
            />

            <AppButton
              title="ใช้ตำแหน่งปัจจุบันของฉัน"
              variant="outline"
              loading={gettingLocation}
              icon={<Ionicons name="navigate-outline" size={18} color={theme.colors.primary} />}
              onPress={() => { void handleUseCurrentLocation(); }}
              style={{ marginTop: theme.spacing.sm }}
            />
            <Text style={styles.pinNote}>
              ทางลัดสำหรับตอนที่คุณยืนอยู่ที่ร้านพอดี
              ถ้าไม่ได้อยู่ที่ร้าน ให้เลือกบนแผนที่แทน
            </Text>
          </FormSection>

          {serverError !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          <AppButton
            title="บันทึกข้อมูลร้าน"
            loading={saving}
            onPress={() => { void handleSave(); }}
          />
          <AppButton
            title="ยกเลิก"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: theme.spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  timeRow: { flexDirection: 'row', gap: theme.spacing.sm },

  pinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pinBoxDone: { backgroundColor: theme.colors.successBg },
  pinTitle: { ...theme.textStyles.body, fontFamily: theme.fonts.medium },
  pinHint: { ...theme.textStyles.caption, marginTop: 2 },
  mapPreview: {
    height: 150,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  previewPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinNote: { ...theme.textStyles.caption, marginTop: theme.spacing.xs },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: { ...theme.textStyles.caption, color: theme.colors.error, flex: 1 },
});
