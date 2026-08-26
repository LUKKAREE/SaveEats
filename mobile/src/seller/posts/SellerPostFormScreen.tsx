/**
 * สร้างโพสต์ขาย
 *
 * ขั้นตอน : เลือกเมนูจากคลัง -> ตั้งราคาลด -> ใส่จำนวน -> เลือกช่วงเวลารับ
 *
 * *** ต้องมีเมนูในคลังก่อน ถ้ายังไม่มีจะพาไปหน้าเพิ่มเมนูให้ ***
 *
 * *** ช่วงเวลารับมี 2 โหมด ***
 *   ปุ่มลัด    - กดเลือกจากตัวเลือกสำเร็จรูป เร็วสุด ใช้ได้กับโพสต์ส่วนใหญ่
 *   กำหนดเอง  - เลือกวันจากปฏิทิน แล้วพิมพ์เวลาเป็นตัวเลข
 *
 * ทำไมต้องมีโหมดกำหนดเอง : ปุ่มลัดตั้งได้ไกลสุดแค่ 3 ชั่วโมงข้างหน้า
 * และเป็นชั่วโมงเต็มเท่านั้น ร้านที่อยากตั้งขายพรุ่งนี้เช้า
 * หรืออยากเปิดรับ 18:30-20:00 (หนึ่งชั่วโมงครึ่ง) จึงทำไม่ได้เลย
 *
 * ทำไมยังเก็บปุ่มลัดไว้ : โพสต์ส่วนใหญ่คือ "ตอนนี้ + 2-3 ชม." จริง ๆ
 * ร้านที่ลงขายวันละหลายรอบจะเสียเวลามากถ้าต้องเลือกวันเวลาใหม่ทุกครั้ง
 *
 * *** ทำไมเวลาถึงเป็นช่องพิมพ์ ไม่ใช่หน้าปัดนาฬิกา ***
 * เดิมใช้หน้าปัดนาฬิกาของ Android (แบบวงกลม) ซึ่งต้องลากเข็ม 2 รอบ
 * (รอบแรกเลือกชั่วโมง รอบสองเลือกนาที) กว่าจะได้ 18:30 ก็หลายจังหวะ
 * และลากพลาดง่ายมากเพราะตัวเลขบนวงกลมอยู่ชิดกัน
 *
 * ร้านรู้เวลาที่ต้องการอยู่แล้ว การพิมพ์ 4 ตัวเลขจึงเร็วกว่าและแม่นกว่า
 * ส่วน "วัน" ยังใช้ปฏิทินอยู่ เพราะพิมพ์วันที่เองเสี่ยงพิมพ์ผิดปี/เดือน
 * และคนมองปฏิทินแล้วเห็นภาพว่าเป็นวันอะไรได้ทันที
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { Food, CreatePostRequest } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import AppTextInput from '../../components/AppTextInput';
import AppButton from '../../components/AppButton';
import FormSection from '../../components/FormSection';
import ImagePickerField from '../../components/ImagePickerField';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';

import foodService from '../services/foodService';
import postService from '../services/postService';
import storeService from '../services/storeService';
import { errorMessage } from '../../core/services/apiClient';
import type { PickedImage } from '../../core/services/apiClient';
import {
  formatPrice, formatTime, formatDate, formatDateTime, toApiDateTime, hoursFromNow,
} from '../../core/utils/formatters';
import { validateForm, validatePrice, validateQuantity } from '../../core/utils/validators';
import { theme } from '../../core/theme/theme';
import type { SellerScreenProps } from '../../navigation/types';

type Props = SellerScreenProps<'SellerPostForm'>;
type FieldName = 'foodId' | 'discountPrice' | 'quantity';

/** ตัวเลือกเวลาเริ่มรับ (ชั่วโมงนับจากตอนนี้) */
const START_OPTIONS = [
  { hours: 0, label: 'ตอนนี้' },
  { hours: 1, label: 'อีก 1 ชม.' },
  { hours: 2, label: 'อีก 2 ชม.' },
  { hours: 3, label: 'อีก 3 ชม.' },
] as const;

/** ตัวเลือกระยะเวลาที่เปิดให้มารับ */
const DURATION_OPTIONS = [1, 2, 3, 4, 6] as const;

/**
 * จองแล้วต้องมารับภายในกี่นาที
 *
 * ตัวเลือกตั้งจากของจริง : ของทอดกับของสดรอไม่ได้นาน
 * ส่วนขนมปังหรือของแห้งถือไว้เป็นชั่วโมงก็ยังขายได้
 */
const HOLD_OPTIONS = [
  { minutes: 15, label: '15 นาที' },
  { minutes: 30, label: '30 นาที' },
  { minutes: 60, label: '1 ชม.' },
  { minutes: 120, label: '2 ชม.' },
] as const;

/** ถือคิวได้นานสุด 12 ชม. กันร้านเผลอพิมพ์เลขหลุด แล้วของค้างคิวข้ามวัน */
const HOLD_MIN = 5;
const HOLD_MAX = 720;

/** 90 -> "1 ชม. 30 นาที" ให้ร้านเห็นชัดว่าเปิดรับนานแค่ไหน */
function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'ช่วงเวลาไม่ถูกต้อง';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

/** ปัดวินาทีทิ้ง เวลาที่แสดงกับที่ส่งไปจะได้ตรงกันเป๊ะ */
function roundToMinute(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

/** 7 -> "07" ใช้กับช่องพิมพ์เวลาที่ต้องมี 2 หลักเสมอ */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** วันเดียวกันไหม (เทียบตามปฏิทิน ไม่ใช่เวลา) */
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * ป้ายบนปุ่มเลือกวัน
 *
 * โพสต์เกือบทั้งหมดเป็นของวันนี้หรือพรุ่งนี้ การเขียนว่า "วันนี้"
 * อ่านแล้วเข้าใจทันทีกว่าการให้ไปคิดเองว่า 24 ส.ค. คือวันไหน
 * ส่วนวันอื่นค่อยแสดงวันที่จริง (ไม่ต้องมีปี เพราะโพสต์ล่วงหน้าข้ามปีไม่มีอยู่จริง)
 */
function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(date, today)) return 'วันนี้';
  if (isSameDay(date, tomorrow)) return 'พรุ่งนี้';
  return formatDate(date);
}

/** ข้อความในช่องพิมพ์เวลา แยกชั่วโมงกับนาทีเป็นคนละช่อง */
interface TimeText {
  hour: string;
  minute: string;
}

/** Date -> { hour: '18', minute: '30' } */
function toTimeText(date: Date): TimeText {
  return { hour: pad2(date.getHours()), minute: pad2(date.getMinutes()) };
}

/**
 * ข้อความที่พิมพ์มาใช้เป็นเวลาได้จริงไหม
 * คืนค่าเป็นตัวเลข ถ้าใช้ไม่ได้คืน null (ยังพิมพ์ไม่เสร็จ หรือเกินช่วง)
 */
function parseTimeText(text: TimeText): { hour: number; minute: number } | null {
  if (text.hour === '' || text.minute === '') return null;
  const hour = Number(text.hour);
  const minute = Number(text.minute);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * แปลง '08:00:00' ที่เก็บในฐานข้อมูล เป็นจำนวนนาทีนับจากเที่ยงคืน
 * ใช้เทียบว่าเวลาที่ร้านเลือกอยู่ในช่วงเปิดร้านหรือไม่
 */
function toMinuteOfDay(time: string | null | undefined): number | null {
  if (!time) return null;
  const parts = time.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * เช็คว่าเวลาที่เลือกอยู่นอกเวลาทำการร้านหรือเปล่า
 *
 * *** แค่เตือน ไม่ห้าม ***
 * ร้านอาจมีเหตุผลจริง เช่น นัดลูกค้ามารับนอกเวลาที่หน้าร้าน
 * หรือเป็นร้านที่เปิดคาบเกี่ยวข้ามเที่ยงคืน
 * การห้ามเด็ดขาดจะทำให้ร้านที่มีเคสพิเศษใช้งานไม่ได้เลย
 *
 * *** รองรับร้านที่เปิดคาบเกี่ยวข้ามคืน ***
 * เช่น เปิด 08:00 ปิด 05:00 (ปิดตีห้าของวันถัดไป)
 * กรณีนี้เวลาปิดจะน้อยกว่าเวลาเปิด ต้องคิดกลับด้าน
 */
function isOutsideOpenHours(
  date: Date,
  openTime: string | null,
  closeTime: string | null
): boolean {
  const open = toMinuteOfDay(openTime);
  const close = toMinuteOfDay(closeTime);
  if (open === null || close === null || open === close) return false;

  const minute = date.getHours() * 60 + date.getMinutes();
  return open < close
    ? minute < open || minute > close        // ช่วงปกติ เช่น 08:00-20:00
    : minute < open && minute > close;       // คาบเกี่ยวข้ามคืน เช่น 20:00-05:00
}

export default function SellerPostFormScreen({ route, navigation }: Props): JSX.Element {
  /*
    ค่าที่ส่งมาจากปุ่ม "ลงขายอีกครั้ง" ในหน้ารายการโพสต์
    ไม่มีค่ามา = เข้ามาสร้างโพสต์ใหม่ตามปกติ ฟอร์มก็ว่างเปล่าเหมือนเดิม

    *** ตั้งเป็นค่าเริ่มต้นของ useState เท่านั้น ไม่ได้ใช้ useEffect เขียนทับทีหลัง ***
    ถ้าใช้ useEffect ค่าที่ร้านเพิ่งพิมพ์แก้จะโดนเขียนกลับเป็นค่าเดิมทุกครั้งที่หน้าเรนเดอร์ใหม่
    ซึ่งน่าหงุดหงิดมากเพราะพิมพ์เท่าไหร่ก็ไม่ติด
  */
  const repost = route.params?.repost;
  /** เช็คแล้วหรือยังว่าเมนูที่จะลงขายซ้ำยังอยู่ในคลังไหม (ทำครั้งเดียวตอนโหลดรอบแรก) */
  const repostChecked = useRef(false);

  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFoodId, setSelectedFoodId] = useState<number | null>(repost?.foodId ?? null);
  const [discountPrice, setDiscountPrice] = useState(
    repost !== undefined ? String(repost.discountPrice) : ''
  );
  const [quantity, setQuantity] = useState(
    repost !== undefined ? String(repost.quantity) : ''
  );
  const [caption, setCaption] = useState(repost?.caption ?? '');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [startHours, setStartHours] = useState<number>(0);
  const [durationHours, setDurationHours] = useState<number>(3);
  /** จองแล้วต้องมารับภายในกี่นาที ก่อนคิวจะหลุดให้คนอื่น */
  const [holdMinutes, setHoldMinutes] = useState<number>(30);

  /** false = ใช้ปุ่มลัด / true = เลือกวันเวลาเอง */
  const [customTime, setCustomTime] = useState(false);
  const [customStart, setCustomStart] = useState<Date>(() => hoursFromNow(0));
  const [customEnd, setCustomEnd] = useState<Date>(() => hoursFromNow(3));

  /*
   * ข้อความในช่องพิมพ์เวลา
   *
   * *** ทำไมต้องเก็บแยกจาก Date ***
   * ระหว่างพิมพ์ ค่าจะยังไม่สมบูรณ์ เช่น พิมพ์ "1" ไปแล้วกำลังจะพิมพ์ "8"
   * ถ้าเอา Date มาแสดงตรง ๆ ตัวเลขจะถูกเติมศูนย์เป็น "01" ทันที
   * แล้วเลข 8 ที่พิมพ์ต่อจะกลายเป็น "018" ซึ่งพิมพ์ต่อไม่ได้เลย
   *
   * จึงให้ช่องพิมพ์ถือข้อความดิบไว้เอง แล้วค่อยกลั่นลง Date เมื่อค่าใช้ได้จริง
   */
  const [startText, setStartText] = useState(() => toTimeText(hoursFromNow(0)));
  const [endText, setEndText] = useState(() => toTimeText(hoursFromNow(3)));

  /** ช่องนาที เอาไว้เด้ง cursor ไปให้เองเมื่อพิมพ์ชั่วโมงครบ 2 หลัก */
  const startMinuteRef = useRef<TextInput>(null);
  const endMinuteRef = useRef<TextInput>(null);

  /** true = กรอกนาทีถือคิวเอง แทนการกดปุ่มสำเร็จรูป */
  const [customHold, setCustomHold] = useState(false);
  const [holdText, setHoldText] = useState('30');

  /** ตอนนี้เปิดปฏิทินของช่องไหนอยู่ (null = ไม่ได้เปิด) */
  const [datePicker, setDatePicker] = useState<null | 'start' | 'end'>(null);

  /** เวลาเปิด-ปิดร้าน เอาไว้เตือนถ้าตั้งเวลารับนอกเวลาทำการ */
  const [openTime, setOpenTime] = useState<string | null>(null);
  const [closeTime, setCloseTime] = useState<string | null>(null);

  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        try {
          /*
           * ดึงเมนูกับข้อมูลร้านพร้อมกัน ไม่ใช่ทีละอัน
           * เวลารวมจะเท่ากับอันที่ช้าที่สุด ไม่ใช่ผลบวกของทั้งสอง
           */
          const [list, myStore] = await Promise.all([
            foodService.listMine(),
            // ดึงเวลาเปิด-ปิดมาเตือนเฉย ๆ ถ้าพลาดก็ไม่เป็นไร ไม่ควรทำให้ทั้งหน้าพัง
            storeService.getMyStore().catch(() => null),
          ]);
          if (!active) return;
          const usable = list.filter((f) => f.is_active === 1);
          setFoods(usable);

          /*
            *** กรณีลงขายอีกครั้ง แต่เมนูเดิมไม่อยู่ในคลังแล้ว ***
            ร้านอาจลบเมนูนั้นทิ้ง หรือปิดการใช้งานไปหลังจากโพสต์รอบก่อน
            ถ้าปล่อยให้ค่าที่เลือกไว้ค้างอยู่ ฟอร์มจะดูเหมือนเลือกเมนูแล้ว
            แต่ไม่มีปุ่มไหนติ๊กเขียว และกดลงขายจะโดน Backend ปฏิเสธโดยไม่รู้สาเหตุ
            จึงล้างค่าทิ้งแล้วบอกไปตรง ๆ ว่าเกิดอะไรขึ้น

            *** เช็คแค่ครั้งเดียว ***
            useFocusEffect นี้ทำงานใหม่ทุกครั้งที่กลับเข้าหน้านี้ และมี dependency เป็น []
            ค่า repost ที่อ่านได้จึงเป็นค่าของการเรนเดอร์ครั้งแรกเสมอ
            ถ้าไม่กันไว้ ร้านที่เลือกเมนูใหม่ไปแล้วจะโดนล้างค่าทิ้งทุกครั้งที่กลับเข้าหน้า
          */
          if (!repostChecked.current) {
            repostChecked.current = true;
            const wanted = repost?.foodId;
            if (wanted !== undefined && !usable.some((f) => f.food_id === wanted)) {
              setSelectedFoodId(null);
              setServerError('เมนูเดิมไม่อยู่ในคลังแล้ว กรุณาเลือกเมนูใหม่');
            }
          }

          if (myStore !== null) {
            setOpenTime(myStore.store.open_time);
            setCloseTime(myStore.store.close_time);
          }
        } catch (err) {
          if (active) setServerError(errorMessage(err));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const selectedFood = useMemo(
    () => foods.find((f) => f.food_id === selectedFoodId) ?? null,
    [foods, selectedFoodId]
  );

  /*
   * เวลาเริ่ม-สิ้นสุดจริงที่จะส่งไป Backend
   * มาจากโหมดไหนก็ได้ ส่วนอื่นของหน้าใช้ค่านี้ตัวเดียว ไม่ต้องรู้ว่าโหมดอะไร
   */
  const pickupStart = useMemo(
    () => (customTime ? roundToMinute(customStart) : hoursFromNow(startHours)),
    [customTime, customStart, startHours]
  );
  const pickupEnd = useMemo(
    () => (customTime ? roundToMinute(customEnd) : hoursFromNow(startHours + durationHours)),
    [customTime, customEnd, startHours, durationHours]
  );

  /** ระยะเวลาที่เปิดรับ (นาที) ใช้แสดงผลและตรวจความถูกต้อง */
  const windowMinutes = Math.round((pickupEnd.getTime() - pickupStart.getTime()) / 60000);

  /** ข้อความเตือน (ไม่ได้ห้ามโพสต์) */
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (isOutsideOpenHours(pickupStart, openTime, closeTime)
      || isOutsideOpenHours(pickupEnd, openTime, closeTime)) {
      list.push(`ช่วงเวลานี้อยู่นอกเวลาทำการร้าน (${formatTime(`2000-01-01 ${openTime ?? ''}`)}`
        + ` - ${formatTime(`2000-01-01 ${closeTime ?? ''}`)}) ลูกค้าอาจมาแล้วไม่เจอคนรับ`);
    }
    if (windowMinutes > 0 && holdMinutes > windowMinutes) {
      list.push('เวลาถือคิวยาวกว่าช่วงเวลารับ ระบบจะตัดให้สั้นลงเท่ากับเวลาปิดรับอัตโนมัติ');
    }
    return list;
  }, [pickupStart, pickupEnd, openTime, closeTime, holdMinutes, windowMinutes]);

  /**
   * ตั้งค่าเวลาเริ่มรับ พร้อมดันเวลาปิดรับตามถ้าจำเป็น
   *
   * ถ้าเวลาเริ่มเลยเวลาปิดรับไปแล้ว ต้องดันเวลาปิดตามไปด้วย
   * ไม่งั้นผู้ใช้จะเจอ error ทันทีที่เลือกวัน ทั้งที่ยังตั้งไม่เสร็จ
   * ซึ่งน่ารำคาญมากเพราะเขาแค่ยังไม่ได้ไปแก้อีกช่อง
   */
  function applyStart(next: Date): void {
    setCustomStart(next);
    if (next.getTime() >= customEnd.getTime()) {
      const pushed = new Date(next.getTime() + 3 * 60 * 60 * 1000);
      setCustomEnd(pushed);
      setEndText(toTimeText(pushed));
    }
  }

  /**
   * รับวันที่จากปฏิทินของระบบ
   *
   * *** ต้องปิด picker ก่อนทุกครั้ง ***
   * บน Android หน้าต่างนี้เป็น dialog ของระบบ ถ้าไม่สั่งปิด
   * มันจะเด้งซ้ำทันทีที่ state เปลี่ยน กลายเป็นปิดไม่ลงเลย
   */
  function handleDateChange(event: DateTimePickerEvent, selected?: Date): void {
    const field = datePicker;
    setDatePicker(null);
    if (event.type !== 'set' || selected === undefined || field === null) return;

    // เอาเฉพาะส่วนวัน คงเวลาที่ร้านพิมพ์ไว้เดิม
    const base = field === 'start' ? customStart : customEnd;
    const next = new Date(base);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());

    if (field === 'start') applyStart(next);
    else setCustomEnd(next);
  }

  /**
   * พิมพ์เวลา
   *
   * รับเฉพาะตัวเลขไม่เกิน 2 หลัก แล้วค่อยกลั่นลง Date เมื่อครบทั้งชั่วโมงและนาที
   * ระหว่างที่ยังพิมพ์ไม่ครบ Date จะยังเป็นค่าเดิม ไม่กระตุกไปมา
   */
  function handleTimeType(
    field: 'start' | 'end',
    part: 'hour' | 'minute',
    raw: string
  ): void {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    const current = field === 'start' ? startText : endText;
    const next: TimeText = { ...current, [part]: digits };

    if (field === 'start') setStartText(next);
    else setEndText(next);

    /*
     * พิมพ์ชั่วโมงครบแล้วเด้งไปช่องนาทีให้เลย
     * เงื่อนไข >= 3 คือกรณีพิมพ์เลขเดียวแล้วต่อไม่ได้อีก เช่น 9 ไม่มี 9x
     * จะได้ไม่ต้องยกนิ้วไปแตะช่องถัดไปเอง ซึ่งเป็นจังหวะที่เสียเวลาที่สุด
     */
    if (part === 'hour' && (digits.length === 2 || Number(digits) >= 3)) {
      (field === 'start' ? startMinuteRef : endMinuteRef).current?.focus();
    }

    const parsed = parseTimeText(next);
    if (parsed === null) return;

    const base = field === 'start' ? customStart : customEnd;
    const updated = new Date(base);
    updated.setHours(parsed.hour, parsed.minute, 0, 0);

    if (field === 'start') applyStart(updated);
    else setCustomEnd(updated);
  }

  /**
   * ออกจากช่องพิมพ์แล้วจัดข้อความให้เรียบร้อย
   *
   * ถ้าพิมพ์ค้างไว้ไม่ครบ (เช่น เหลือ "1" หรือใส่ 99) ให้ดึงค่าจริงจาก Date กลับมาแสดง
   * ผู้ใช้จะได้ไม่เห็นตัวเลขค้างที่ระบบไม่ได้ใช้จริง แล้วเข้าใจผิดว่าตั้งไปแล้ว
   */
  function handleTimeBlur(field: 'start' | 'end'): void {
    const source = field === 'start' ? customStart : customEnd;
    if (field === 'start') setStartText(toTimeText(source));
    else setEndText(toTimeText(source));
  }

  /** สลับไปโหมดกำหนดเอง โดยเริ่มจากค่าที่ปุ่มลัดเลือกไว้ จะได้ไม่ต้องตั้งใหม่หมด */
  function enableCustomTime(): void {
    const start = hoursFromNow(startHours);
    const end = hoursFromNow(startHours + durationHours);
    setCustomStart(start);
    setCustomEnd(end);
    setStartText(toTimeText(start));
    setEndText(toTimeText(end));
    setCustomTime(true);
  }

  async function handleSubmit(): Promise<void> {
    setServerError(null);

    const { isValid, errors: formErrors } = validateForm<FieldName>({
      foodId: () => (selectedFoodId === null ? 'กรุณาเลือกเมนูที่จะขาย' : null),
      discountPrice: () =>
        validatePrice(discountPrice, selectedFood ? { max: selectedFood.normal_price } : {}),
      quantity: () => validateQuantity(quantity, { min: 1, max: 999 }),
    });
    setErrors(formErrors);
    if (!isValid || selectedFoodId === null) return;

    /*
     * ตรวจช่วงเวลา
     *
     * เช็คตรงนี้แทนที่จะใส่ใน validateForm เพราะไม่ได้ผูกกับช่องกรอกช่องใดช่องหนึ่ง
     * จึงแสดงเป็นข้อความรวมด้านล่างแทนการขึ้นใต้ช่อง
     */
    if (pickupEnd.getTime() <= pickupStart.getTime()) {
      setServerError('เวลาปิดรับต้องอยู่หลังเวลาเริ่มรับ');
      return;
    }
    // เผื่อ 1 นาที กันกรณีกดปุ่มช้าจนเวลาที่เลือกกลายเป็นอดีตไปแล้วพอดี
    if (pickupEnd.getTime() <= Date.now() - 60_000) {
      setServerError('ช่วงเวลารับผ่านไปแล้ว กรุณาเลือกเวลาใหม่');
      return;
    }
    if (holdMinutes < HOLD_MIN || holdMinutes > HOLD_MAX) {
      setServerError(`เวลาถือคิวต้องอยู่ระหว่าง ${HOLD_MIN} ถึง ${HOLD_MAX} นาที`);
      return;
    }

    const body: CreatePostRequest = {
      foodId: selectedFoodId,
      discountPrice: Number(discountPrice),
      quantity: Number(quantity),
      pickupStart: toApiDateTime(pickupStart),
      pickupEnd: toApiDateTime(pickupEnd),
      holdMinutes,
      ...(caption.trim() !== '' ? { caption: caption.trim() } : {}),
    };

    setSaving(true);
    try {
      await postService.create(body, image);
      navigation.goBack();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingView message="กำลังโหลดคลังเมนู..." />
      </ScreenContainer>
    );
  }

  // ยังไม่มีเมนูในคลัง -> โพสต์ไม่ได้ ต้องไปเพิ่มเมนูก่อน
  if (foods.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          icon="restaurant-outline"
          title="ยังไม่มีเมนูในคลัง"
          message="ต้องเพิ่มเมนูเข้าคลังก่อน แล้วค่อยเลือกมาสร้างโพสต์ขาย"
          actionLabel="ไปเพิ่มเมนู"
          onAction={() => navigation.navigate('SellerFoodForm')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {serverError !== null ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          {/* ---- 1. เลือกเมนู ---- */}
          <FormSection title="1. เลือกเมนูที่จะขาย" hint="เลือกจากเมนูที่มีอยู่ในคลัง">
            {foods.map((food) => {
              const active = selectedFoodId === food.food_id;
              return (
                <TouchableOpacity
                  key={food.food_id}
                  style={[styles.foodRow, active ? styles.foodRowActive : null]}
                  onPress={() => {
                    setSelectedFoodId(food.food_id);
                    // เดาราคาลดให้ครึ่งหนึ่งของราคาปกติ ร้านแก้ทีหลังได้
                    if (discountPrice === '') {
                      setDiscountPrice(String(Math.round(Number(food.normal_price) / 2)));
                    }
                  }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodPrice}>ราคาปกติ {formatPrice(food.normal_price)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {errors.foodId !== undefined ? (
              <Text style={styles.fieldError}>{errors.foodId}</Text>
            ) : null}
          </FormSection>

          {/* ---- 2. ราคาและจำนวน ---- */}
          <FormSection title="2. ราคาลดและจำนวน">
            <AppTextInput
              label="ราคาที่ขายวันนี้ (บาท)"
              value={discountPrice}
              onChangeText={setDiscountPrice}
              placeholder="35"
              keyboardType="numeric"
              error={errors.discountPrice ?? null}
              helperText={
                selectedFood !== null
                  ? `ต้องไม่เกินราคาปกติ ${formatPrice(selectedFood.normal_price)}`
                  : 'เลือกเมนูก่อนเพื่อดูราคาปกติ'
              }
            />

            <AppTextInput
              label="จำนวนที่ขาย (ชุด)"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="10"
              keyboardType="numeric"
              error={errors.quantity ?? null}
              helperText="ระบบจะตัดจำนวนให้อัตโนมัติทุกครั้งที่มีคนจอง"
            />
          </FormSection>

          {/* ---- 3. ช่วงเวลารับ ---- */}
          <FormSection title="3. ช่วงเวลาที่ให้มารับ">
            {/* ---- สลับโหมด ---- */}
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentItem, !customTime ? styles.segmentItemActive : null]}
                onPress={() => setCustomTime(false)}
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color={!customTime ? theme.colors.primaryDark : theme.colors.textMuted}
                />
                <Text style={[styles.segmentText, !customTime ? styles.segmentTextActive : null]}>
                  ปุ่มลัด
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentItem, customTime ? styles.segmentItemActive : null]}
                onPress={enableCustomTime}
              >
                <Ionicons
                  name="calendar"
                  size={14}
                  color={customTime ? theme.colors.primaryDark : theme.colors.textMuted}
                />
                <Text style={[styles.segmentText, customTime ? styles.segmentTextActive : null]}>
                  กำหนดเอง
                </Text>
              </TouchableOpacity>
            </View>

            {customTime ? (
              /* ---------- โหมดกำหนดเอง ---------- */
              <>
                {(['start', 'end'] as const).map((field) => {
                  const value = field === 'start' ? customStart : customEnd;
                  const text = field === 'start' ? startText : endText;
                  const minuteRef = field === 'start' ? startMinuteRef : endMinuteRef;
                  return (
                    <View key={field} style={styles.pickRow}>
                      <Text style={styles.pickLabel}>
                        {field === 'start' ? 'เริ่มรับได้' : 'ปิดรับเวลา'}
                      </Text>

                      <View style={styles.pickButtons}>
                        {/* วัน : ใช้ปฏิทิน เพราะพิมพ์วันที่เองเสี่ยงผิดเดือน/ปี */}
                        <TouchableOpacity
                          style={styles.dateButton}
                          onPress={() => setDatePicker(field)}
                        >
                          <Ionicons name="calendar-outline" size={16} color={theme.colors.primaryDark} />
                          <Text style={styles.dateButtonText} numberOfLines={1}>
                            {formatDayLabel(value)}
                          </Text>
                        </TouchableOpacity>

                        {/* เวลา : พิมพ์เอง ชั่วโมงกับนาทีแยกช่อง */}
                        <View style={styles.timeBox}>
                          <TextInput
                            style={styles.timeInput}
                            value={text.hour}
                            onChangeText={(raw) => handleTimeType(field, 'hour', raw)}
                            onBlur={() => handleTimeBlur(field)}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="00"
                            placeholderTextColor={theme.colors.textMuted}
                            selectTextOnFocus
                            returnKeyType="next"
                          />
                          <Text style={styles.timeColon}>:</Text>
                          <TextInput
                            ref={minuteRef}
                            style={styles.timeInput}
                            value={text.minute}
                            onChangeText={(raw) => handleTimeType(field, 'minute', raw)}
                            onBlur={() => handleTimeBlur(field)}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="00"
                            placeholderTextColor={theme.colors.textMuted}
                            selectTextOnFocus
                            returnKeyType="done"
                          />
                          <Text style={styles.timeUnit}>น.</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <Text style={styles.typeHint}>
                  พิมพ์เวลาแบบ 24 ชม. เช่น 18 : 30 หมายถึงหกโมงครึ่งเย็น
                </Text>
              </>
            ) : (
              /* ---------- โหมดปุ่มลัด ---------- */
              <>
                <Text style={styles.subLabel}>เริ่มรับได้เมื่อไหร่</Text>
                <View style={styles.chipRow}>
                  {START_OPTIONS.map((opt) => {
                    const active = startHours === opt.hours;
                    return (
                      <TouchableOpacity
                        key={opt.hours}
                        style={[styles.chip, active ? styles.chipActive : null]}
                        onPress={() => setStartHours(opt.hours)}
                      >
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.subLabel}>เปิดให้รับนานแค่ไหน</Text>
                <View style={styles.chipRow}>
                  {DURATION_OPTIONS.map((h) => {
                    const active = durationHours === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.chip, active ? styles.chipActive : null]}
                        onPress={() => setDurationHours(h)}
                      >
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                          {h} ชม.
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ---- เวลาถือคิว ---- */}
            <Text style={styles.subLabel}>จองแล้วต้องมารับภายใน</Text>
            <View style={styles.chipRow}>
              {HOLD_OPTIONS.map((opt) => {
                const active = !customHold && holdMinutes === opt.minutes;
                return (
                  <TouchableOpacity
                    key={opt.minutes}
                    style={[styles.chip, active ? styles.chipActive : null]}
                    onPress={() => {
                      setCustomHold(false);
                      setHoldMinutes(opt.minutes);
                    }}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.chip, customHold ? styles.chipActive : null]}
                onPress={() => {
                  setCustomHold(true);
                  setHoldText(String(holdMinutes));
                }}
              >
                <Text style={[styles.chipText, customHold ? styles.chipTextActive : null]}>
                  กำหนดเอง
                </Text>
              </TouchableOpacity>
            </View>

            {customHold ? (
              <AppTextInput
                label={`จำนวนนาที (${HOLD_MIN}-${HOLD_MAX})`}
                value={holdText}
                onChangeText={(text) => {
                  // รับเฉพาะตัวเลข กันผู้ใช้พิมพ์ตัวอักษรหรือจุดทศนิยมเข้ามา
                  const digits = text.replace(/[^0-9]/g, '').slice(0, 3);
                  setHoldText(digits);
                  const num = Number(digits);
                  if (digits !== '' && num >= HOLD_MIN && num <= HOLD_MAX) setHoldMinutes(num);
                }}
                keyboardType="number-pad"
                leftIcon="hourglass-outline"
                helperText="เช่น 45 = ลูกค้าต้องมารับภายใน 45 นาทีหลังกดจอง"
              />
            ) : null}

            {/* ---- สรุปให้อ่านก่อนโพสต์ ---- */}
            <View style={styles.timePreview}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primaryDark} />
              <Text style={styles.timePreviewText}>
                ลูกค้ามารับได้ {formatDateTime(pickupStart)} ถึง {formatDateTime(pickupEnd)}
                {'\n'}รวม {formatDuration(windowMinutes)}
                {'\n'}เมื่อจองแล้วต้องมารับภายใน {holdMinutes} นาที ไม่งั้นคิวจะหลุดให้คนอื่น
              </Text>
            </View>

            {/*
              ---- คำเตือน ----
              เตือนอย่างเดียว ไม่บล็อกการโพสต์
              ร้านอาจมีเหตุผลจริง เช่น นัดลูกค้ามารับนอกเวลาที่หน้าร้าน
            */}
            {warnings.map((text) => (
              <View key={text} style={styles.warnBox}>
                <Ionicons name="alert-circle-outline" size={17} color={theme.colors.warningText} />
                <Text style={styles.warnText}>{text}</Text>
              </View>
            ))}
          </FormSection>

          {/* ---- 4. รายละเอียดเพิ่มเติม ---- */}
          <FormSection title="4. ข้อความและรูป (ไม่บังคับ)">
            <AppTextInput
              label="ข้อความบนโพสต์"
              value={caption}
              onChangeText={setCaption}
              placeholder="เช่น กะเพราเหลือจากมื้อเที่ยง มารับได้เลย"
              multiline
              autoCapitalize="sentences"
              maxLength={500}
            />

            <ImagePickerField
              label="รูปของรอบนี้"
              value={image}
              onChange={setImage}
              hint="ไม่ใส่ก็ได้ ระบบจะใช้รูปของเมนูแทนให้อัตโนมัติ"
            />
          </FormSection>

          <AppButton
            title="ลงขายเลย"
            onPress={() => { void handleSubmit(); }}
            loading={saving}
          />
        </ScrollView>

      {/*
        ---- ปฏิทินของระบบ ----
        วางไว้นอก ScrollView เพราะบน Android มันคือ dialog ของระบบ
        ไม่ได้วาดอยู่ในหน้าเรา ตำแหน่งใน JSX จึงไม่มีผลต่อการแสดงผล
        แต่ถ้าวางไว้ในลิสต์ที่เลื่อนได้ อาจถูก unmount ตอนเลื่อนพ้นจอ
      */}
      {datePicker !== null ? (
        <DateTimePicker
          value={datePicker === 'start' ? customStart : customEnd}
          mode="date"
          display="default"
          // ห้ามเลือกวันย้อนหลัง โพสต์ที่หมดอายุไปแล้วไม่มีประโยชน์
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      ) : null}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  errorBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.errorBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.error,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm + 2,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  foodRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  foodInfo: { flex: 1, marginLeft: theme.spacing.sm },
  foodName: { ...theme.textStyles.body },
  foodPrice: { ...theme.textStyles.caption },
  fieldError: { ...theme.textStyles.caption, color: theme.colors.error },

  subLabel: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.textStyles.bodyMuted, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },

  segment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  segmentItemActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  segmentText: { ...theme.textStyles.caption, color: theme.colors.textMuted },
  segmentTextActive: {
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.medium,
  },

  pickRow: { marginBottom: theme.spacing.md },
  pickLabel: {
    ...theme.textStyles.caption,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  pickButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: theme.sizes.inputHeight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateButtonText: { ...theme.textStyles.body, color: theme.colors.textPrimary },

  /* ---- ช่องพิมพ์เวลา ---- */
  timeBox: {
    /*
      flex: 1 เท่ากับปุ่มเลือกวัน สองกล่องจะได้กว้างเท่ากันพอดี
      ถ้าปล่อยให้กว้างตามเนื้อหา กล่องเวลาจะเล็กกว่าจนดูไม่เป็นคู่กัน
    */
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: theme.sizes.inputHeight,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  timeInput: {
    ...theme.textStyles.body,
    color: theme.colors.textPrimary,
    /*
      ตัวเลขความกว้างเท่ากันทุกตัว ช่องจะได้ไม่ขยับตอนพิมพ์
      ถ้าไม่ใส่ เลข 1 จะแคบกว่าเลข 8 แล้วเครื่องหมาย : จะเลื่อนไปมา
    */
    fontVariant: ['tabular-nums'],
    width: 30,
    textAlign: 'center',
    // Android ใส่ padding ในช่องพิมพ์มาให้เอง ต้องล้างทิ้งไม่งั้นสูงเกิน
    paddingVertical: 0,
  },
  timeColon: {
    ...theme.textStyles.body,
    color: theme.colors.textSecondary,
    marginHorizontal: 1,
  },
  timeUnit: {
    /*
      วางลอยชิดขวา ไม่ให้นับรวมในการจัดกึ่งกลาง
      ถ้าปล่อยให้อยู่ในแถวปกติ ตัว "น." จะดันเลขเวลาเบี้ยวไปทางซ้าย
      แล้วดูไม่ตรงกับคำว่า "วันนี้" ในกล่องข้าง ๆ
    */
    position: 'absolute',
    right: theme.spacing.sm,
    ...theme.textStyles.caption,
    color: theme.colors.textMuted,
  },
  typeHint: {
    ...theme.textStyles.caption,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm + 2,
    marginTop: theme.spacing.sm,
  },
  warnText: { ...theme.textStyles.caption, color: theme.colors.warningText, flex: 1, lineHeight: 19 },

  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm + 2,
  },
  timePreviewText: {
    ...theme.textStyles.bodyMuted,
    color: theme.colors.primaryDark,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
});
