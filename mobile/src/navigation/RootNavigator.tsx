/**
 * ตัวแยกทางหลักของแอป
 *
 * ตรรกะการตัดสินใจ
 *
 *   ยังโหลด session ไม่เสร็จ  ->  หน้าจอ Loading
 *   ยังไม่ได้ Login           ->  กลุ่มหน้า Auth (Login / Register)
 *   Login แล้ว + role seller  ->  SellerTabs
 *   Login แล้ว + role อื่น    ->  CustomerTabs
 *
 * *** Customer กับ Seller ใช้แอปตัวเดียวกัน แยกทางกันตรงนี้ที่เดียว ***
 * ไม่ต้องแยกเป็นสองโปรเจกต์
 *
 * หมายเหตุ : role admin เข้าใช้ผ่าน Admin Web เท่านั้น
 *            ถ้า admin เผลอ login ในแอป จะเห็นหน้าเหมือน customer
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import OnboardingScreen from '../features/auth/screens/OnboardingScreen';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';

import CustomerTabs from './CustomerTabs';
import SellerTabs from './SellerTabs';

// หน้าจอที่เปิดทับขึ้นมาจากแท็บ (ไม่ได้อยู่ในเมนูล่าง)
import PostDetailScreen from '../features/feed/screens/PostDetailScreen';
import SearchScreen from '../features/search/screens/SearchScreen';
import FilterScreen from '../features/filter/screens/FilterScreen';
import StoreDetailScreen from '../features/store/screens/StoreDetailScreen';
import StoreLocationScreen from '../features/store/screens/StoreLocationScreen';
import ReservationConfirmScreen from '../features/reservation/screens/ReservationConfirmScreen';
import ReservationSuccessScreen from '../features/reservation/screens/ReservationSuccessScreen';
import ReservationDetailScreen from '../features/reservation/screens/ReservationDetailScreen';
import WriteReviewScreen from '../features/review/screens/WriteReviewScreen';
import MyReviewsScreen from '../features/review/screens/MyReviewsScreen';
import MyReportsScreen from '../features/report/screens/MyReportsScreen';
import NotificationScreen from '../features/notification/screens/NotificationScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import ReportScreen from '../features/report/screens/ReportScreen';

import SellerStoreScreen from '../seller/store/SellerStoreScreen';
import SellerEditStoreScreen from '../seller/store/SellerEditStoreScreen';
import PickLocationScreen from '../seller/store/PickLocationScreen';
import SellerFoodListScreen from '../seller/foodManagement/SellerFoodListScreen';
import SellerFoodFormScreen from '../seller/foodManagement/SellerFoodFormScreen';
import SellerPostFormScreen from '../seller/posts/SellerPostFormScreen';
import EnterReservationCodeScreen from '../seller/reservations/EnterReservationCodeScreen';
import SellerReviewScreen from '../seller/reviews/SellerReviewScreen';

import LoadingView from '../components/LoadingView';
import { useAuth } from '../context/AuthContext';
import { theme } from '../core/theme/theme';
import type { AuthStackParamList, CustomerStackParamList, SellerStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const SellerStack = createNativeStackNavigator<SellerStackParamList>();

/** สไตล์แถบหัวเรื่องด้านบน ใช้เหมือนกันทุกหน้า */
const headerOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: theme.colors.surface },
  headerTintColor: theme.colors.textPrimary,
  headerTitleStyle: { fontFamily: theme.fonts.semiBold, fontSize: 17 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

/** กลุ่มหน้าก่อน Login */
function AuthNavigator(): JSX.Element {
  return (
    <AuthStack.Navigator screenOptions={headerOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'สมัครสมาชิก' }} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'ลืมรหัสผ่าน' }}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'ตั้งรหัสผ่านใหม่' }}
      />
    </AuthStack.Navigator>
  );
}

/** กลุ่มหน้าของลูกค้า */
function CustomerNavigator(): JSX.Element {
  return (
    <CustomerStack.Navigator screenOptions={headerOptions}>
      <CustomerStack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false }} />
      <CustomerStack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'รายละเอียดอาหาร' }} />
      <CustomerStack.Screen name="Search" component={SearchScreen} options={{ title: 'ค้นหา' }} />
      <CustomerStack.Screen name="Filter" component={FilterScreen} options={{ title: 'ตัวกรอง', presentation: 'modal' }} />
      <CustomerStack.Screen name="StoreDetail" component={StoreDetailScreen} options={{ title: 'รายละเอียดร้าน' }} />
      <CustomerStack.Screen name="ReservationConfirm" component={ReservationConfirmScreen} options={{ title: 'ยืนยันการจอง' }} />
      <CustomerStack.Screen
        name="ReservationSuccess"
        component={ReservationSuccessScreen}
        options={{ title: 'จองสำเร็จ', headerBackVisible: false }}
      />
      <CustomerStack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'รายละเอียดการจอง' }} />
      <CustomerStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'เขียนรีวิว' }} />
      <CustomerStack.Screen name="MyReviews" component={MyReviewsScreen} options={{ title: 'รีวิวของฉัน' }} />
      <CustomerStack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'เรื่องที่ฉันแจ้ง' }} />
      <CustomerStack.Screen name="Notifications" component={NotificationScreen} options={{ title: 'การแจ้งเตือน' }} />
      <CustomerStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'แก้ไขข้อมูลส่วนตัว' }} />
      <CustomerStack.Screen name="Report" component={ReportScreen} options={{ title: 'แจ้งปัญหา' }} />
      <CustomerStack.Screen name="StoreLocation" component={StoreLocationScreen} options={{ title: 'ตำแหน่งร้าน' }} />
    </CustomerStack.Navigator>
  );
}

/** กลุ่มหน้าของร้านค้า */
function SellerNavigator(): JSX.Element {
  return (
    <SellerStack.Navigator screenOptions={headerOptions}>
      <SellerStack.Screen name="SellerTabs" component={SellerTabs} options={{ headerShown: false }} />
      <SellerStack.Screen name="SellerStore" component={SellerStoreScreen} options={{ title: 'ข้อมูลร้าน' }} />
      <SellerStack.Screen name="SellerEditStore" component={SellerEditStoreScreen} options={{ title: 'แก้ไขข้อมูลร้าน' }} />
      {/* headerShown: false เพราะหน้านี้วาดแถบของตัวเองทับบนแผนที่เต็มจอ */}
      <SellerStack.Screen
        name="SellerPickLocation"
        component={PickLocationScreen}
        options={{ headerShown: false }}
      />
      <SellerStack.Screen name="SellerFoods" component={SellerFoodListScreen} options={{ title: 'คลังเมนูอาหาร' }} />
      <SellerStack.Screen name="SellerFoodForm" component={SellerFoodFormScreen} options={{ title: 'เพิ่ม/แก้ไขเมนู' }} />
      {/* หัวข้อเปลี่ยนตามว่าเข้ามาสร้างใหม่ หรือกด "ลงขายอีกครั้ง" จากโพสต์เก่า
          ร้านจะได้รู้ทันทีว่าทำไมฟอร์มถึงมีค่ากรอกไว้ให้แล้ว */}
      <SellerStack.Screen
        name="SellerPostForm"
        component={SellerPostFormScreen}
        options={({ route }) => ({
          title: route.params?.repost !== undefined ? 'ลงขายอีกครั้ง' : 'สร้างโพสต์ขาย',
        })}
      />
      <SellerStack.Screen name="SellerEnterCode" component={EnterReservationCodeScreen} options={{ title: 'กรอกรหัส 4 หลัก' }} />
      <SellerStack.Screen name="SellerReviews" component={SellerReviewScreen} options={{ title: 'รีวิวและคะแนน' }} />
      <SellerStack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'เรื่องที่ฉันแจ้ง' }} />
      {/*
        ร้านค้าก็ต้องแก้ชื่อ/เบอร์/รูปโปรไฟล์ของตัวเองได้เหมือนลูกค้า
        ใช้หน้าจอตัวเดียวกัน ไม่ต้องเขียนซ้ำ
      */}
      <SellerStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'แก้ไขข้อมูลส่วนตัว' }} />
      <SellerStack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'รายละเอียดการจอง' }} />
      <SellerStack.Screen name="Notifications" component={NotificationScreen} options={{ title: 'การแจ้งเตือน' }} />
      <SellerStack.Screen name="Report" component={ReportScreen} options={{ title: 'แจ้งปัญหา' }} />
      <SellerStack.Screen name="StoreLocation" component={StoreLocationScreen} options={{ title: 'ตำแหน่งร้าน' }} />
    </SellerStack.Navigator>
  );
}

export default function RootNavigator(): JSX.Element {
  const { isLoggedIn, isSeller, initializing, showOnboarding, completeOnboarding } = useAuth();

  if (initializing) {
    return <LoadingView message="กำลังเปิด SaveEats..." />;
  }

  /*
   * หน้าแนะนำแอปหลังสมัครสมาชิกเสร็จ
   *
   * *** วางไว้นอก NavigationContainer โดยตั้งใจ ***
   * เพราะเป็นหน้าคั่นชั่วคราวที่ไม่ควรมีปุ่มย้อนกลับ ไม่ควรอยู่ในประวัติการนำทาง
   * และไม่ควรให้ผู้ใช้กดปุ่ม back ของเครื่องแล้วหลุดกลับไปหน้าสมัครได้
   *
   * ตอนนี้ผู้ใช้ถือว่า login แล้วเรียบร้อย พอกดจบก็เข้าแอปได้ทันที
   */
  if (isLoggedIn && showOnboarding) {
    return <OnboardingScreen onDone={completeOnboarding} />;
  }

  return (
    <NavigationContainer>
      {!isLoggedIn ? <AuthNavigator /> : isSeller ? <SellerNavigator /> : <CustomerNavigator />}
    </NavigationContainer>
  );
}
