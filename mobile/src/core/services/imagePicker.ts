/**
 * เลือกรูปจากเครื่องหรือถ่ายรูปใหม่
 *
 * ใช้ expo-image-picker ห่อไว้ให้เรียกง่าย จะได้ไม่ต้องเขียนซ้ำทุกหน้าจอ
 * ผลลัพธ์ที่ได้เอาไปส่งเข้า uploadRequest() ของ apiClient ได้เลย
 *
 * *** เรื่องกรอบครอบตัดรูป (crop) ***
 * เดิมล็อกสัดส่วนไว้ที่ 4:3 ทุกหน้า ผลคือกรอบครอบตัดเล็กกว่ารูปมาก
 * ร้านเลือกได้แค่ส่วนกลางของรูป ตัดหัวหรือท้ายทิ้งไปเองไม่ได้
 * รูปอาหารที่ถ่ายแนวตั้งมาโดนตัดจนเหลือแค่กลางจาน ซึ่งเสียของ
 *
 * ตอนนี้ปล่อยให้ลากกรอบเองได้อิสระ (ไม่ส่ง aspect)
 * ทำได้เพราะทุกที่ที่เอารูปไปแสดงใช้ resizeMode="cover"
 * ซึ่งจะย่อ/ขยายให้เต็มกรอบเสมอ ไม่ว่ารูปต้นฉบับจะสัดส่วนไหน
 *
 * ยกเว้นรูปโปรไฟล์ที่ยังล็อกเป็นสี่เหลี่ยมจัตุรัส เพราะแสดงในกรอบวงกลม
 * ถ้าปล่อยอิสระแล้วเลือกรูปยาว ๆ มา จะโดนวงกลมตัดจนไม่เหลืออะไร
 */
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import type { PickedImage } from './apiClient';

/** แปลงผลลัพธ์ของ expo-image-picker เป็นรูปแบบที่ apiClient ต้องการ */
function toPickedImage(result: ImagePicker.ImagePickerResult): PickedImage | null {
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset === undefined) return null;

  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/** ตัวเลือกตอนเรียกใช้ */
export interface PickOptions {
  /**
   * ล็อกสัดส่วนกรอบครอบตัด เช่น [1, 1] = สี่เหลี่ยมจัตุรัส
   *
   * ไม่ส่งมา = ลากกรอบได้อิสระ (แนะนำสำหรับรูปอาหารและรูปร้าน)
   *
   * *** มีผลเฉพาะบน Android ***
   * iOS ใช้หน้าตัดรูปของระบบซึ่งเป็นสี่เหลี่ยมจัตุรัสเสมอ ปรับไม่ได้
   */
  aspect?: [number, number] | undefined;
}

/** แปลง options ของเราเป็นค่าที่ expo-image-picker เข้าใจ */
function toExpoOptions(options: PickOptions) {
  return {
    allowsEditing: true,
    // ใส่ aspect เฉพาะตอนที่ระบุมาจริง ๆ
    // ถ้าส่ง undefined เข้าไปตรง ๆ Android จะถอยไปใช้ค่าเริ่มต้น 4:3
    ...(options.aspect !== undefined ? { aspect: options.aspect } : {}),
    // 0.7 = บีบอัดให้ไฟล์เล็กลง แต่ยังคมพอสำหรับหน้าจอมือถือ
    quality: 0.7,
  };
}

export const imagePicker = {
  /** เลือกรูปจากคลังภาพ คืน null ถ้าผู้ใช้ยกเลิกหรือไม่อนุญาต */
  async fromLibrary(options: PickOptions = {}): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องขออนุญาตก่อน', 'กรุณาอนุญาตให้ SaveEats เข้าถึงรูปภาพในเครื่อง');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // เลือกได้เฉพาะรูปภาพ ไม่เอาวิดีโอ
      //
      // เดิมเขียนว่า  ImagePicker.MediaTypeOptions.Images
      // ตั้งแต่ expo-image-picker 16 ตัวนั้นถูกประกาศเลิกใช้ (deprecated)
      // ให้ส่งเป็น array ของชนิดสื่อแทน ผลลัพธ์เหมือนเดิมทุกประการ
      // ค่าอื่นที่ใส่ได้ : 'videos' , 'livePhotos'
      mediaTypes: ['images'],
      ...toExpoOptions(options),
    });
    return toPickedImage(result);
  },

  /** ถ่ายรูปใหม่ด้วยกล้อง */
  async fromCamera(options: PickOptions = {}): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องขออนุญาตก่อน', 'กรุณาอนุญาตให้ SaveEats ใช้กล้อง');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync(toExpoOptions(options));
    return toPickedImage(result);
  },

  /** ให้ผู้ใช้เลือกว่าจะถ่ายใหม่หรือเลือกจากคลัง */
  async choose(options: PickOptions = {}): Promise<PickedImage | null> {
    return new Promise((resolve) => {
      Alert.alert('เลือกรูปภาพ', 'ต้องการรูปจากที่ไหน', [
        { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(null) },
        { text: 'ถ่ายรูปใหม่', onPress: () => { void imagePicker.fromCamera(options).then(resolve); } },
        { text: 'เลือกจากคลังภาพ', onPress: () => { void imagePicker.fromLibrary(options).then(resolve); } },
      ]);
    });
  },
};

export default imagePicker;
