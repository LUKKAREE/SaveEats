/**
 * กล่องครอบฟอร์ม ใช้ให้ทุกหน้าฟอร์มหน้าตาเหมือนกัน
 */
import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { theme } from '../core/theme/theme';

interface FormSectionProps {
  title?: string;
  hint?: string;
  children: ReactNode;
}

export default function FormSection({ title, hint, children }: FormSectionProps): JSX.Element {
  return (
    <View style={styles.card}>
      {title !== undefined ? <Text style={styles.title}>{title}</Text> : null}
      {hint !== undefined ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  title: { ...theme.textStyles.subheading, marginBottom: theme.spacing.xs },
  hint: { ...theme.textStyles.caption, marginBottom: theme.spacing.md },
});
