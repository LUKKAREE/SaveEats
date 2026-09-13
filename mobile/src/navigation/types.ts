/**
 * ชนิดของ parameter ที่แต่ละหน้าจอรับ
 *
 * *** นี่คือประโยชน์ใหญ่อีกข้อของ TypeScript ***
 *
 * เดิม (JavaScript)
 *     navigation.navigate('PostDetail', { postid: 5 })   <- พิมพ์ผิด ไม่มีใครเตือน
 *     แอปจะพังตอนเปิดหน้านั้น และหาสาเหตุยากมาก
 *
 * ตอนนี้ (TypeScript)
 *     navigation.navigate('PostDetail', { postid: 5 })
 *     ^ ขึ้นเส้นแดงทันที บอกว่าต้องเป็น postId ไม่ใช่ postid
 *
 * วิธีใช้ในหน้าจอ
 *     type Props = CustomerScreenProps<'PostDetail'>;
 *     export default function PostDetailScreen({ route, navigation }: Props) {
 *       const { postId } = route.params;   // <- TypeScript รู้ว่าเป็น number
 *     }
 *
 * *** โครงสร้าง Navigation ของ SaveEats ***
 *   Stack  = หน้าที่เปิดทับขึ้นมา มีปุ่มย้อนกลับ
 *   Tabs   = เมนูล่าง อยู่ในหน้าแรกของ Stack
 *
 *   ถ้าจะกระโดดจาก Stack ไปที่แท็บ ต้องเขียนแบบซ้อน
 *       navigation.navigate('CustomerTabs', { screen: 'ReservationHistory' })
 */
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { FeedItem, ReservationDetail, ReportTargetType } from '@shared/index';

/**
 * parameter ของหน้าแจ้งปัญหา
 * ใช้ร่วมกันทั้งสอง stack เพราะทั้งลูกค้าและร้านแจ้งปัญหาได้
 */
export interface ReportParams {
  targetType: ReportTargetType;
  targetId: number;
  /** ชื่อของสิ่งที่แจ้ง เอาไว้โชว์บนหัวหน้าจอ ไม่ได้ส่งไป Backend */
  targetName?: string;
}

/**
 * parameter ของหน้ารายละเอียดเรื่องที่แจ้ง
 * ใช้ร่วมกันทั้งสอง stack เพราะทั้งลูกค้าและร้านแจ้งปัญหาได้
 *
 * *** ส่งมาแค่ report_id ***
 * ต่างจากหน้าอื่นที่ส่งข้อมูลมาทั้งก้อน เพราะหน้านี้ต้องยิงไปเอาบทสนทนาอยู่แล้ว
 * และสถานะของเรื่องเปลี่ยนได้ตลอดเวลาที่ผู้ดูแลกำลังตรวจ
 * ถ้าส่งข้อมูลเก่ามาแสดง ผู้ใช้จะเห็นสถานะที่ไม่ตรงกับความจริง
 */
export interface ReportDetailParams {
  reportId: number;
}

/**
 * parameter ของหน้าดูตำแหน่งร้านบนแผนที่
 * ใช้ร่วมกันทั้งสอง stack เพราะหน้ารายละเอียดการจองเปิดได้ทั้งลูกค้าและร้าน
 *
 * *** ส่งพิกัดมาทั้งก้อน ไม่ได้ส่งแค่ storeId ***
 * ทุกที่ที่เปิดหน้านี้มีข้อมูลร้านอยู่ในมือแล้ว การยิง API ซ้ำมีแต่ทำให้ช้าลง
 * และผู้ใช้ต้องมองหน้าเปล่า ๆ รอโหลดอีกจังหวะโดยไม่ได้อะไรเพิ่ม
 *
 * latitude/longitude เป็น number ไม่ใช่ null เพราะหน้าที่เรียกต้องเช็คมาก่อนแล้ว
 * ว่าร้านปักหมุดไว้จริง ถ้ายังไม่ปักก็ไม่ควรมีปุ่มให้กดตั้งแต่แรก
 */
export interface StoreLocationParams {
  storeName: string;
  address?: string | null;
  latitude: number;
  longitude: number;
}

/**
 * หน้าจอก่อน Login
 *
 * รีเซ็ตรหัสผ่านทำจนจบได้ในแอป : ForgotPassword -> ResetPassword -> Login
 * ไม่ต้องออกไปเปิดเบราว์เซอร์ (แต่ลิงก์ในอีเมลก็ยังใช้ได้ ถ้าสะดวกกว่า)
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  /** กรอกอีเมลเพื่อขอรหัสตั้งรหัสผ่านใหม่ */
  ForgotPassword: undefined;
  /**
   * กรอกรหัส 6 หลัก แล้วตั้งรหัสผ่านใหม่ในแอปเลย
   *
   * demoCode มีค่าเฉพาะตอนที่เซิร์ฟเวอร์ยังไม่ได้ผูกบัญชีส่งอีเมล
   * ระบบจริงจะเป็น null เสมอ เพราะรหัสต้องเดินทางไปทางอีเมลเท่านั้น
   */
  /*
   * demoCode = รหัสที่เซิร์ฟเวอร์กรอกให้ (มีเฉพาะตอนอีเมลมีจริง + ยังไม่ตั้ง SMTP)
   * demoMode = เซิร์ฟเวอร์ยังไม่ได้ผูกบัญชีส่งอีเมลหรือไม่
   *
   * ต้องใช้ demoMode ตัดสินว่าจะวาดหน้าจอแบบไหน ห้ามใช้ demoCode
   * เพราะ demoCode เป็น null ตอนอีเมลไม่มีในระบบด้วย ซึ่งจะทำให้
   * หน้าจอต่างกันแล้วบอกใบ้ว่าอีเมลนั้นเป็นสมาชิกหรือเปล่า
   */
  ResetPassword: { email: string; demoCode: string | null; demoMode: boolean };
};

/** แท็บล่างของลูกค้า */
export type CustomerTabParamList = {
  Home: undefined;
  Map: undefined;
  ReservationHistory: undefined;
  /** ร้านที่กดหัวใจไว้ */
  Favorites: undefined;
  Profile: undefined;
};

/** หน้าจอของลูกค้า (undefined = หน้านั้นไม่ต้องส่ง parameter) */
export type CustomerStackParamList = {
  /** หน้าแรก เป็นตัวครอบแท็บล่างทั้ง 5 แท็บ */
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  PostDetail: { postId: number };
  Search: undefined;
  Filter: undefined;
  StoreDetail: { storeId: number };
  ReservationConfirm: { post: FeedItem };
  ReservationSuccess: { reservation: ReservationDetail };
  ReservationDetail: { reservationId: number };
  WriteReview: { reservationId: number; storeName: string };
  /** รีวิวทั้งหมดที่ลูกค้าคนนี้เคยเขียน (เข้าจากแท็บ "ฉัน") */
  MyReviews: undefined;
  /** เรื่องที่เคยแจ้งปัญหาไว้ พร้อมสถานะล่าสุด (เข้าจากแท็บ "ฉัน") */
  MyReports: undefined;
  ReportDetail: ReportDetailParams;
  Notifications: undefined;
  EditProfile: undefined;
  /**
   * เปลี่ยนรหัสผ่านตอนที่ยังล็อกอินอยู่ (คนละอย่างกับ ResetPassword ใน AuthStack)
   * ResetPassword ใช้ตอนเข้าแอปไม่ได้ ต้องยืนยันตัวตนผ่านอีเมล
   * ส่วนหน้านี้ใช้รหัสผ่านเดิมเป็นตัวยืนยันแทน
   */
  ChangePassword: undefined;
  Report: ReportParams;
  /** ดูตำแหน่งร้านบนแผนที่เต็มจอ (ดูอย่างเดียว ย้ายหมุดไม่ได้) */
  StoreLocation: StoreLocationParams;
};

/** แท็บล่างของร้านค้า */
export type SellerTabParamList = {
  SellerDashboard: undefined;
  SellerPosts: undefined;
  SellerScanQr: undefined;
  SellerReservations: undefined;
  Profile: undefined;
};

/** หน้าจอของร้านค้า */
export type SellerStackParamList = {
  /** หน้าแรก เป็นตัวครอบแท็บล่างทั้ง 5 แท็บ */
  SellerTabs: NavigatorScreenParams<SellerTabParamList> | undefined;
  SellerStore: undefined;
  /**
   * แก้ไขข้อมูลร้าน
   *
   * pickedLocation มีค่าเมื่อผู้ใช้เพิ่งเลือกตำแหน่งจากหน้าแผนที่กลับมา
   * หน้านี้จะเอาไปใส่ในฟอร์มแล้วเคลียร์ทิ้ง เพื่อไม่ให้ค่าเดิมค้างวนซ้ำ
   */
  SellerEditStore: { pickedLocation?: { latitude: number; longitude: number } } | undefined;
  /** เลือกตำแหน่งร้านบนแผนที่ ส่งพิกัดเดิมไปเพื่อเปิดแผนที่ตรงจุดนั้น */
  SellerPickLocation: { initial?: { latitude: number; longitude: number } } | undefined;
  SellerFoods: undefined;
  /** ไม่ส่ง foodId = โหมดเพิ่มใหม่ / ส่ง foodId = โหมดแก้ไข */
  SellerFoodForm: { foodId?: number } | undefined;
  /**
   * สร้างโพสต์ขาย
   *
   * repost มีค่าเมื่อร้านกด "ลงขายอีกครั้ง" จากโพสต์เก่าที่หมดเวลาไปแล้ว
   * ฟอร์มจะกรอกเมนู ราคา จำนวน มาให้ล่วงหน้า เหลือแค่ตั้งเวลาใหม่
   *
   * *** ส่งค่ามาเลย ไม่ได้ส่งแค่ postId ***
   * หน้ารายการโพสต์มีข้อมูลครบอยู่ในมือแล้ว การให้ฟอร์มไปยิง API ถามซ้ำ
   * มีแต่ทำให้ผู้ใช้ต้องรอโหลดอีกจังหวะโดยไม่ได้อะไรเพิ่ม
   */
  SellerPostForm: {
    repost?: { foodId: number; discountPrice: number; quantity: number; caption: string | null };
  } | undefined;
  SellerEnterCode: undefined;
  SellerReviews: undefined;
  ReservationDetail: { reservationId: number };
  /** ร้านก็แจ้งปัญหาได้ จึงต้องดูประวัติของตัวเองได้เหมือนกัน */
  MyReports: undefined;
  ReportDetail: ReportDetailParams;
  Notifications: undefined;
  /** ร้านก็แก้ชื่อ/เบอร์/รูปโปรไฟล์ของตัวเองได้ ใช้หน้าจอเดียวกับฝั่งลูกค้า */
  EditProfile: undefined;
  /** ร้านก็เปลี่ยนรหัสผ่านตัวเองได้ ใช้หน้าจอเดียวกับฝั่งลูกค้า */
  ChangePassword: undefined;
  Report: ReportParams;
  /** ดูตำแหน่งร้านบนแผนที่เต็มจอ (หน้ารายละเอียดการจองใช้ร่วมกันทั้งสองฝั่ง) */
  StoreLocation: StoreLocationParams;
};

/**
 * รวมหน้าจอของทั้งสองฝั่งเข้าด้วยกัน
 *
 * ใช้เฉพาะหน้าที่ถูกแสดงทั้งฝั่งลูกค้าและฝั่งร้าน
 * ตอนนี้มีหน้าเดียวคือ ProfileScreen (อยู่ในแท็บสุดท้ายของทั้งสองฝั่ง)
 * หน้าแบบนี้ไม่รู้ล่วงหน้าว่าตัวเองอยู่ใน stack ไหน จึงต้องใช้ชนิดที่ครอบทั้งคู่
 */
export type AppStackParamList = CustomerStackParamList & SellerStackParamList;

// ---- ตัวย่อสำหรับใช้ในไฟล์หน้าจอ ----
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type CustomerScreenProps<T extends keyof CustomerStackParamList> =
  NativeStackScreenProps<CustomerStackParamList, T>;

export type SellerScreenProps<T extends keyof SellerStackParamList> =
  NativeStackScreenProps<SellerStackParamList, T>;

export type CustomerTabProps<T extends keyof CustomerTabParamList> =
  BottomTabScreenProps<CustomerTabParamList, T>;
