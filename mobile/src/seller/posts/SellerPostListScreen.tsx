/**
 * โพสต์ขายของร้าน
 *
 * *** โพสต์ที่จบไปแล้วไม่ได้ถูกลบทิ้ง แต่ถูกย้ายออกจากทาง ***
 *
 * งานหลักของร้านบนหน้านี้คือดูว่า "ตอนนี้ขายอะไรอยู่"
 * ถ้าเอาโพสต์ที่หมดเวลาไปกองปนกับของที่ยังขายอยู่ ของที่ยังขายจะถูกดันตกไปข้างล่าง
 * ยิ่งร้านลงขายทุกวัน ยิ่งกองสูงขึ้นเรื่อย ๆ จนหาของจริงไม่เจอ
 *
 * แต่จะลบทิ้งก็ไม่ได้ เพราะ
 *   1. ร้านต้องดูย้อนหลังได้ว่ารอบนั้นขายได้กี่ชุด
 *   2. ร้านขายเมนูเดิมซ้ำแทบทุกวัน โพสต์เก่าจึงเป็นทางลัดสร้างโพสต์ใหม่ที่เร็วที่สุด
 *   3. ในฐานข้อมูล posts -> reservations -> reviews เป็น CASCADE ทุกเส้น
 *      ลบโพสต์ = ลบประวัติการจองและรีวิวหายตามไปด้วย (Backend กันไว้แล้ว)
 *
 * จึงใช้วิธี "เก็บไว้ แต่ย้ายออกจากทาง" ตามที่แอปร้านค้าจริงเขาทำกัน
 *   - ค่าเริ่มต้นแสดงเฉพาะที่ยังขายอยู่
 *   - ของที่จบแล้วดูได้จากแถบกรอง และแสดงแบบจาง ๆ
 *   - ปุ่มหลักของโพสต์ที่จบแล้วคือ "ลงขายอีกครั้ง" ไม่ใช่ "ลบ"
 */
import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, ScrollView,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FeedItem, PostStatus } from '@shared/index';
import { POST_STATUS_LABEL } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import AppButton from '../../components/AppButton';
import postService from '../services/postService';
import { errorMessage } from '../../core/services/apiClient';
import { imageUrl } from '../../core/constants/apiConstants';
import { formatPrice, formatPickupRange, formatTimeLeft } from '../../core/utils/formatters';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

/** สีของป้ายสถานะโพสต์ */
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active: { bg: theme.colors.successBg, text: theme.colors.success },
  sold_out: { bg: theme.colors.warningBg, text: theme.colors.warningText },
  expired: { bg: theme.colors.surfaceAlt, text: theme.colors.textMuted },
  hidden: { bg: theme.colors.surfaceAlt, text: theme.colors.textMuted },
};

/**
 * โพสต์นี้ยัง "มีชีวิต" อยู่ไหม
 *
 * นับ sold_out เป็นของที่ยังมีชีวิต เพราะร้านยังต้องดูแลอยู่
 * ถ้ามีคนยกเลิกการจอง ของจะเด้งกลับมาขายได้อีก (increaseQuantity ตั้งกลับเป็น active ให้)
 * ต่างจาก expired ที่จบแล้วจบเลย เวลาย้อนกลับไม่ได้
 */
function isLive(status: PostStatus): boolean {
  return status === 'active' || status === 'sold_out';
}

/** แถบกรองด้านบน */
type FilterKey = 'live' | 'expired' | 'all';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'live', label: 'กำลังขาย' },
  { key: 'expired', label: 'หมดเวลา' },
  { key: 'all', label: 'ทั้งหมด' },
];

export default function SellerPostListScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [posts, setPosts] = useState<FeedItem[]>([]);
  /* เริ่มที่ "กำลังขาย" เพราะเป็นสิ่งที่ร้านเปิดหน้านี้มาดูเกือบทุกครั้ง */
  const [filter, setFilter] = useState<FilterKey>('live');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setPosts(await postService.listMine());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

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

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  /** นับไว้โชว์บนแถบกรอง ร้านจะได้รู้ว่าอีกแท็บมีของอยู่กี่อันโดยไม่ต้องกดเข้าไปดู */
  const counts = useMemo(() => ({
    live: posts.filter((p) => isLive(p.status)).length,
    expired: posts.filter((p) => !isLive(p.status)).length,
    all: posts.length,
  }), [posts]);

  const visible = useMemo(() => {
    if (filter === 'all') return posts;
    if (filter === 'live') return posts.filter((p) => isLive(p.status));
    return posts.filter((p) => !isLive(p.status));
  }, [posts, filter]);

  function confirmDelete(post: FeedItem): void {
    Alert.alert(
      'ลบโพสต์',
      `ต้องการลบโพสต์ "${post.food_name}" ใช่หรือไม่\n\n`
      + 'ลบได้เฉพาะโพสต์ที่ยังไม่มีใครจองเท่านั้น',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await postService.remove(post.post_id);
                await load();
              } catch (err) {
                // Backend ปฏิเสธถ้ามีการจองผูกอยู่ ข้อความอธิบายเหตุผลมาให้แล้ว
                Alert.alert('ลบไม่ได้', errorMessage(err));
              }
            })();
          },
        },
      ]
    );
  }

  /**
   * ลงขายเมนูเดิมอีกครั้ง
   *
   * ส่งค่าเดิมไปให้ฟอร์มกรอกไว้ล่วงหน้า ร้านเหลือแค่ตั้งเวลาใหม่แล้วกดลงขาย
   * นี่คือเหตุผลหลักที่เก็บโพสต์เก่าไว้ ไม่ใช่แค่ให้ดูย้อนหลังเฉย ๆ
   */
  function repost(post: FeedItem): void {
    navigation.navigate('SellerPostForm', {
      repost: {
        foodId: post.food_id,
        discountPrice: Number(post.discount_price),
        quantity: post.quantity_total,
        caption: post.caption,
      },
    });
  }

  const header = (
    <>
      <AppButton
        title="สร้างโพสต์ขายใหม่"
        icon={<Ionicons name="add" size={20} color={theme.colors.textOnPrimary} />}
        onPress={() => navigation.navigate('SellerPostForm')}
        style={{ marginBottom: theme.spacing.md }}
      />

      {/*
        แถบกรอง : ใช้ ScrollView ไม่ใช่ FlatList เพราะมีแค่ 3 ปุ่มตายตัว
        FlatList จะทยอยวัดขนาดทีละใบ ทำให้เห็นปุ่มขยับตอนเปิดหน้า
      */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {item.label} ({counts[item.key]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingView message="กำลังโหลดโพสต์..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.post_id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void handleRefresh(); }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => {
          const uri = imageUrl(item.image, 'food');
          const badge = STATUS_STYLE[item.status] ?? STATUS_STYLE['active'];
          const sold = item.quantity_total - item.quantity_left;
          const finished = !isLive(item.status);

          return (
            /*
              โพสต์ที่จบแล้วทำให้จางลง บอกด้วยสายตาว่านี่คือของที่ไม่ต้องสนใจแล้ว
              เร็วกว่าการให้ผู้ใช้อ่านป้ายสถานะทีละใบมาก โดยเฉพาะตอนเลือกดู "ทั้งหมด"
              ที่ของสองแบบปนกันอยู่
            */
            <View style={[styles.card, finished ? styles.cardFinished : null]}>
              <View style={styles.topRow}>
                {uri !== null ? (
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="fast-food-outline" size={26} color={theme.colors.textMuted} />
                  </View>
                )}

                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.food_name}</Text>
                    <View style={[styles.badge, { backgroundColor: badge?.bg }]}>
                      <Text style={[styles.badgeText, { color: badge?.text }]}>
                        {POST_STATUS_LABEL[item.status]}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.priceRow}>
                    <Text style={styles.strike}>{formatPrice(item.normal_price)}</Text>
                    {'  '}
                    <Text style={styles.price}>{formatPrice(item.discount_price)}</Text>
                  </Text>

                  <Text style={styles.meta}>
                    ขายไปแล้ว {sold} จาก {item.quantity_total} ชุด  (เหลือ {item.quantity_left})
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.timeText}>
                  {formatPickupRange(item.pickup_start, item.pickup_end)}
                </Text>
                <Text style={styles.timeLeft}>{formatTimeLeft(item.pickup_end)}</Text>
              </View>

              {/*
                *** ปุ่มของโพสต์ที่จบแล้ว ต่างจากของที่ยังขายอยู่ ***
                โพสต์ที่จบแล้ว สิ่งที่ร้านอยากทำต่อคือ "ลงขายอันนี้อีกรอบ" ไม่ใช่ลบ
                จึงให้ปุ่มลงขายอีกครั้งเป็นพระเอก แล้วดันปุ่มลบไปเป็นตัวรอง
              */}
              <View style={styles.actionRow}>
                {finished ? (
                  <TouchableOpacity style={styles.repostButton} onPress={() => repost(item)}>
                    <Ionicons name="repeat" size={16} color={theme.colors.primaryDark} />
                    <Text style={styles.repostText}>ลงขายอีกครั้ง</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  <Text style={styles.deleteText}>ลบโพสต์</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          error !== null ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="โหลดข้อมูลไม่สำเร็จ"
              message={error}
              actionLabel="ลองอีกครั้ง"
              onAction={() => { void handleRefresh(); }}
            />
          ) : posts.length === 0 ? (
            <EmptyState
              icon="newspaper-outline"
              title="ยังไม่มีโพสต์ขาย"
              message="เลือกเมนูจากคลังมาสร้างโพสต์ ตั้งราคาลดกับช่วงเวลารับ แล้วลูกค้าจะเห็นใน Feed ทันที"
              actionLabel="สร้างโพสต์แรก"
              onAction={() => navigation.navigate('SellerPostForm')}
            />
          ) : (
            /*
              มีโพสต์อยู่ แต่แท็บที่เลือกไม่มีอะไร
              ต้องแยกข้อความจากกรณี "ยังไม่มีโพสต์เลย" ไม่งั้นร้านที่มีโพสต์อยู่ 5 อัน
              จะเห็นคำว่า "ยังไม่มีโพสต์ขาย" แล้วตกใจว่าของหายไปไหนหมด
            */
            <EmptyState
              icon="funnel-outline"
              title={filter === 'live' ? 'ตอนนี้ยังไม่มีโพสต์ที่ขายอยู่' : 'ยังไม่มีโพสต์ที่หมดเวลา'}
              message={
                filter === 'live'
                  ? 'โพสต์ที่เคยลงไว้หมดเวลาไปแล้วทั้งหมด กดสร้างโพสต์ใหม่ หรือดูแท็บหมดเวลาเพื่อลงขายเมนูเดิมอีกครั้ง'
                  : 'โพสต์ทั้งหมดของคุณยังอยู่ในช่วงเวลารับ'
              }
              actionLabel={filter === 'live' ? 'สร้างโพสต์ขายใหม่' : undefined}
              onAction={
                filter === 'live' ? () => navigation.navigate('SellerPostForm') : undefined
              }
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  topRow: { flexDirection: 'row' },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: theme.spacing.sm + 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...theme.textStyles.subheading, flex: 1, marginRight: theme.spacing.xs },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  badgeText: { ...theme.textStyles.caption, fontFamily: theme.fonts.medium },
  priceRow: { marginTop: 2 },
  strike: { ...theme.textStyles.priceStrike, fontSize: 13 },
  price: { ...theme.textStyles.price, fontSize: 17 },
  meta: { ...theme.textStyles.caption },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timeText: { ...theme.textStyles.caption, marginLeft: 4 },
  timeLeft: {
    ...theme.textStyles.caption,
    color: theme.colors.accent,
    fontFamily: theme.fonts.medium,
    marginLeft: 'auto',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  deleteButton: { flexDirection: 'row', alignItems: 'center' },
  deleteText: { ...theme.textStyles.caption, color: theme.colors.error, marginLeft: 4 },

  /*
    ปุ่มลงขายอีกครั้งมีกรอบและพื้นหลัง ส่วนปุ่มลบเป็นข้อความเปล่า
    ความต่างของน้ำหนักนี้บอกเองว่าอันไหนคือสิ่งที่ควรกด โดยไม่ต้องเขียนอธิบาย
  */
  repostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginRight: 'auto',
  },
  repostText: {
    ...theme.textStyles.caption,
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.medium,
  },

  /* จางลงทั้งใบ แต่ยังอ่านออก ไม่ใช่จางจนต้องเพ่ง */
  cardFinished: { opacity: 0.62 },

  filterRow: { gap: theme.spacing.xs, paddingBottom: theme.spacing.md },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.textStyles.caption, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.textOnPrimary, fontFamily: theme.fonts.medium },
});
