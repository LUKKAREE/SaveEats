/**
 * ค้นหาอาหารและร้าน (ใช้ได้จริงแล้ว)
 *
 * *** จุดสำคัญของหน้านี้คือ debounce ***
 * ถ้ายิง API ทุกครั้งที่พิมพ์ 1 ตัวอักษร คำว่า "ข้าวกะเพรา" จะยิง 10 ครั้ง
 * ทำให้เปลืองเน็ต เซิร์ฟเวอร์ทำงานหนัก และผลลัพธ์อาจสลับกันมาถึงผิดลำดับ
 *
 * วิธีแก้ : รอให้ผู้ใช้หยุดพิมพ์ 400 มิลลิวินาทีก่อน แล้วค่อยยิงครั้งเดียว
 *
 * หลัก UX
 *   - เปิดหน้ามาโฟกัสช่องค้นหาให้เลย ผู้ใช้ไม่ต้องแตะซ้ำ
 *   - ยังไม่พิมพ์อะไร ให้เห็นคำค้นยอดนิยม จะได้ไม่เจอหน้าจอว่าง ๆ
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FeedItem } from '@shared/index';

import ScreenContainer from '../../../components/ScreenContainer';
import LoadingView from '../../../components/LoadingView';
import EmptyState from '../../../components/EmptyState';
import FoodPostCard from '../../feed/components/FoodPostCard';

import feedService from '../../feed/feedService';
import { errorMessage } from '../../../core/services/apiClient';
import { theme } from '../../../core/theme/theme';
import type { CustomerScreenProps } from '../../../navigation/types';

type Props = CustomerScreenProps<'Search'>;

/** เวลาที่รอหลังผู้ใช้หยุดพิมพ์ ก่อนจะยิง API (มิลลิวินาที) */
const DEBOUNCE_MS = 400;

/** ความยาวขั้นต่ำที่จะเริ่มค้นหา สั้นกว่านี้ผลลัพธ์จะกว้างเกินไปจนไม่มีประโยชน์ */
const MIN_LENGTH = 2;

/** คำค้นแนะนำ โชว์ตอนยังไม่ได้พิมพ์อะไร */
const SUGGESTIONS = ['ข้าว', 'กะเพรา', 'ขนมปัง', 'เค้ก', 'ชา', 'ไก่'];

export default function SearchScreen({ navigation }: Props): JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** true = เคยค้นหาไปแล้วอย่างน้อย 1 ครั้ง ใช้แยกระหว่าง "ยังไม่ได้ค้น" กับ "ค้นแล้วไม่เจอ" */
  const [searched, setSearched] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const search = useCallback(async (text: string): Promise<void> => {
    if (text.trim().length < MIN_LENGTH) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await feedService.getFeed({ search: text.trim(), limit: 30 });
      setResults(res.data);
      setSearched(true);
    } catch (err) {
      setError(errorMessage(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- debounce : ตั้งเวลาใหม่ทุกครั้งที่พิมพ์ ตัวเก่าจะถูกยกเลิกไป ----
  useEffect(() => {
    const timer = setTimeout(() => {
      void search(keyword);
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); };
  }, [keyword, search]);

  // เปิดหน้ามาแล้วให้คีย์บอร์ดเด้งขึ้นเลย
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => { clearTimeout(timer); };
  }, []);

  const showSuggestions = keyword.trim().length < MIN_LENGTH;

  return (
    <ScreenContainer padded={false}>
      {/* ---- ช่องค้นหา ---- */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="ชื่ออาหารหรือชื่อร้าน"
            placeholderTextColor={theme.colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            onSubmitEditing={() => { void search(keyword); }}
            autoCorrect={false}
          />
          {keyword !== '' ? (
            <TouchableOpacity onPress={() => setKeyword('')} accessibilityLabel="ล้างคำค้น">
              <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ---- ยังไม่ได้พิมพ์ : โชว์คำค้นแนะนำ ---- */}
      {showSuggestions ? (
        <View style={styles.suggestWrap}>
          <Text style={styles.suggestTitle}>ลองค้นหาคำเหล่านี้</Text>
          <View style={styles.suggestRow}>
            {SUGGESTIONS.map((word) => (
              <TouchableOpacity
                key={word}
                style={styles.suggestChip}
                onPress={() => setKeyword(word)}
              >
                <Ionicons name="search" size={14} color={theme.colors.primaryDark} />
                <Text style={styles.suggestText}>{word}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>พิมพ์อย่างน้อย {MIN_LENGTH} ตัวอักษรเพื่อเริ่มค้นหา</Text>
        </View>
      ) : loading ? (
        <LoadingView message="กำลังค้นหา..." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.post_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultCount}>พบ {results.length} รายการ</Text>
            ) : null
          }
          ListEmptyComponent={
            error !== null ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="ค้นหาไม่สำเร็จ"
                message={error}
                actionLabel="ลองใหม่"
                onAction={() => { void search(keyword); }}
              />
            ) : searched ? (
              <EmptyState
                icon="search-outline"
                title={`ไม่พบ "${keyword}"`}
                message="ลองใช้คำสั้นลง หรือค้นด้วยชื่อร้านแทน อาหารบางอย่างอาจขายหมดไปแล้ว"
              />
            ) : null
          }
          renderItem={({ item }) => (
            <FoodPostCard
              post={item}
              onPress={() => navigation.navigate('PostDetail', { postId: item.post_id })}
              onReserve={() => navigation.navigate('ReservationConfirm', { post: item })}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: theme.sizes.inputHeight,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: { ...theme.textStyles.body, flex: 1, padding: 0 },

  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  resultCount: { ...theme.textStyles.caption, marginBottom: theme.spacing.sm },

  suggestWrap: { padding: theme.spacing.md },
  suggestTitle: { ...theme.textStyles.subheading, marginBottom: theme.spacing.sm },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
  },
  suggestText: { ...theme.textStyles.caption, color: theme.colors.primaryDark },
  hint: { ...theme.textStyles.caption, marginTop: theme.spacing.lg, textAlign: 'center' },
});
