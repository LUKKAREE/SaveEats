/**
 * หน้าจอตอนไม่มีข้อมูล
 *
 * หลัก UX : อย่าปล่อยหน้าว่างเปล่า ให้บอกว่า
 *   1. ตอนนี้ไม่มีอะไร  2. เพราะอะไร  3. ทำอะไรต่อได้บ้าง
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../core/theme/theme';
import AppButton from './AppButton';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'fast-food-outline',
  title = 'ยังไม่มีข้อมูล',
  message = '',
  actionLabel,
  onAction,
}: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={44} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message !== '' ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel !== undefined && onAction !== undefined ? (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: { ...theme.textStyles.heading, textAlign: 'center', marginBottom: theme.spacing.xs },
  message: { ...theme.textStyles.bodyMuted, textAlign: 'center', maxWidth: 300 },
  action: { marginTop: theme.spacing.lg },
});
