/**
 * หน้าแนะนำแอป (Onboarding) - 3 สไลด์
 *
 * *** แสดงหลังสมัครสมาชิกสำเร็จเท่านั้น ***
 * ไม่ใช่ตอนเปิดแอปครั้งแรก เพราะคนที่ยังไม่ได้เป็นสมาชิก
 * ไม่ควรโดนหน้าแนะนำขวางก่อนจะได้เห็นหน้า Login ด้วยซ้ำ
 * ส่วนคนที่เพิ่งสมัครเสร็จคือคนที่ "ยังไม่รู้ว่าแอปนี้ทำอะไรได้บ้าง" จริง ๆ
 *
 * หน้านี้ไม่ได้อยู่ใน Stack ไหนเลย RootNavigator เป็นคนเรียกวาดตรง ๆ
 * แล้วส่ง onDone มาให้ พอดูจบก็เข้าแอปได้เลย ไม่ต้องผ่านหน้า Login ซ้ำ
 *
 * หลัก UX
 *   - มีปุ่ม "ข้าม" ตลอด คนที่รีบจะได้ไม่ต้องปัดครบ 3 หน้า
 *   - จุดบอกตำแหน่งด้านล่าง ให้รู้ว่าเหลืออีกกี่หน้า
 *   - ปัดซ้ายขวาได้ ไม่ต้องกดปุ่มอย่างเดียว
 *
 * หมายเหตุ : ตอนนี้ใช้ไอคอนแทนรูปประกอบไปก่อน
 * ถ้ามีไฟล์ภาพแล้ว ให้เอาไปวางที่ assets/images/ แล้วเปลี่ยน <Ionicons>
 * เป็น <Image source={require('...')} /> ได้เลย ส่วนอื่นไม่ต้องแก้
 */
import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, FlatList,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../../../components/AppButton';
import { theme } from '../../../core/theme/theme';
import { APP_NAME, APP_TAGLINE } from '../../../core/constants/appConstants';

interface OnboardingScreenProps {
  /** เรียกเมื่อดูจบหรือกดข้าม - RootNavigator จะพาเข้าแอปต่อให้ */
  onDone: () => void;
}

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'leaf',
    title: APP_NAME,
    description: 'ร่วมกันลดขยะอาหาร\nเพื่อโลก เพื่อเรา เพื่ออนาคต',
  },
  {
    key: 'value',
    icon: 'bag-handle',
    title: 'อร่อยคุ้มค่า\nช่วยลดขยะอาหาร',
    description: 'เชื่อมต่อร้านอาหารท้องถิ่นกับคนในชุมชน\nให้ทุกมื้อมีคุณค่า ไม่ถูกทิ้งเปล่า',
  },
  {
    key: 'nearby',
    icon: 'storefront',
    title: 'ง่ายสะดวก\nใกล้คุณ',
    description: 'ค้นหาร้านใกล้คุณ จองและรับอาหารได้ง่าย ๆ\nในราคาพิเศษ',
  },
];

export default function OnboardingScreen({ onDone }: OnboardingScreenProps): JSX.Element {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  function goNext(): void {
    if (isLast) {
      onDone();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  /** อัปเดตจุดบอกตำแหน่งตอนผู้ใช้ปัดเอง */
  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        // บอกความกว้างล่วงหน้า scrollToIndex จะได้ไม่ต้องวัดเอง (เร็วกว่าและไม่พลาด)
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={72} color={theme.colors.primary} />
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>

            {item.key === 'welcome' ? (
              <Text style={styles.tagline}>{APP_TAGLINE}</Text>
            ) : null}
          </View>
        )}
      />

      {/* ---- จุดบอกตำแหน่ง ---- */}
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            style={[styles.dot, i === index ? styles.dotActive : null]}
          />
        ))}
      </View>

      {/* ---- ปุ่มด้านล่าง ---- */}
      <View style={styles.footer}>
        <AppButton title={isLast ? 'เริ่มใช้งาน' : 'ถัดไป'} onPress={goNext} />

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onDone}
          // ขยายพื้นที่กดให้ใหญ่กว่าตัวหนังสือ นิ้วโป้งจะได้กดโดน
          hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
        >
          <Text style={styles.skipText}>{isLast ? ' ' : 'ข้าม'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.textStyles.title,
    color: theme.colors.primaryDark,
    textAlign: 'center',
  },
  description: {
    ...theme.textStyles.bodyMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 24,
  },
  tagline: {
    ...theme.textStyles.caption,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: theme.spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryLight,
  },
  // จุดของหน้าปัจจุบันทำเป็นแคปซูลยาว มองปราดเดียวรู้ว่าอยู่หน้าไหน
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },

  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  skipText: { ...theme.textStyles.bodyMuted },
});
