/**
 * คลังเมนูอาหารของร้าน
 *
 * *** เมนูในคลัง ยังไม่ใช่ของที่ประกาศขาย (ทางเลือก A) ***
 * ร้านต้องเอาเมนูไปสร้าง "โพสต์ขาย" อีกทีถึงจะขึ้น Feed ของลูกค้า
 * หน้านี้เลยต้องอธิบายให้ผู้ใช้เข้าใจจุดนี้ให้ชัด
 */
import { useCallback, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Food } from '@shared/index';

import ScreenContainer from '../../components/ScreenContainer';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import AppButton from '../../components/AppButton';
import foodService from '../services/foodService';
import { errorMessage } from '../../core/services/apiClient';
import { imageUrl } from '../../core/constants/apiConstants';
import { formatPrice } from '../../core/utils/formatters';
import { theme } from '../../core/theme/theme';
import type { SellerStackParamList } from '../../navigation/types';

type Navigation = NativeStackNavigationProp<SellerStackParamList>;

export default function SellerFoodListScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();

  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setFoods(await foodService.listMine());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  /**
   * useFocusEffect = โหลดใหม่ทุกครั้งที่กลับมาที่หน้านี้
   * จำเป็นเพราะพอเพิ่มเมนูเสร็จแล้ว navigation.goBack() มา ต้องเห็นเมนูใหม่ทันที
   */
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

  function confirmDelete(food: Food): void {
    Alert.alert(
      'ลบเมนู',
      `ต้องการลบ "${food.name}" ใช่หรือไม่\n\nโพสต์ขายที่ใช้เมนูนี้จะถูกลบไปด้วย`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await foodService.remove(food.food_id);
                await load();
              } catch (err) {
                Alert.alert('ลบไม่สำเร็จ', errorMessage(err));
              }
            })();
          },
        },
      ]
    );
  }

  const header = (
    <View>
      <View style={styles.noticeBox}>
        <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} />
        <Text style={styles.noticeText}>
          เมนูในคลังยังไม่ขึ้นขาย ต้องเอาไปสร้างโพสต์อีกทีถึงจะขึ้นหน้า Feed ของลูกค้า
        </Text>
      </View>

      <AppButton
        title="เพิ่มเมนูใหม่"
        icon={<Ionicons name="add" size={20} color={theme.colors.textOnPrimary} />}
        onPress={() => navigation.navigate('SellerFoodForm')}
        style={{ marginBottom: theme.spacing.md }}
      />
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingView message="กำลังโหลดคลังเมนู..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={foods}
        keyExtractor={(item) => String(item.food_id)}
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
          return (
            <View style={styles.card}>
              {uri !== null ? (
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Ionicons name="fast-food-outline" size={26} color={theme.colors.textMuted} />
                </View>
              )}

              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.category}>
                  {item.category_name ?? 'ยังไม่ได้เลือกหมวดหมู่'}
                </Text>
                <Text style={styles.price}>ราคาปกติ {formatPrice(item.normal_price)}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => navigation.navigate('SellerFoodForm', { foodId: item.food_id })}
                  accessibilityLabel={`แก้ไข ${item.name}`}
                >
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => confirmDelete(item)}
                  accessibilityLabel={`ลบ ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
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
          ) : (
            <EmptyState
              icon="restaurant-outline"
              title="ยังไม่มีเมนูในคลัง"
              message="เริ่มจากเพิ่มเมนูที่ร้านขายประจำก่อน แล้วค่อยเลือกมาสร้างโพสต์ขายในแต่ละวัน"
              actionLabel="เพิ่มเมนูแรก"
              onAction={() => navigation.navigate('SellerFoodForm')}
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },

  noticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.infoBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  noticeText: {
    ...theme.textStyles.caption,
    color: theme.colors.info,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm + 2,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: theme.spacing.sm + 2 },
  name: { ...theme.textStyles.subheading },
  category: { ...theme.textStyles.caption },
  price: { ...theme.textStyles.bodyMuted, color: theme.colors.textPrimary },
  actions: { flexDirection: 'row' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
