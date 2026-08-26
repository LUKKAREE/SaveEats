/** หน้าจอตอนกำลังโหลด */
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../core/theme/theme';

export default function LoadingView({ message = 'กำลังโหลด...' }: { message?: string }): JSX.Element {
  return (
    <View style={styles.wrapper}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  text: { ...theme.textStyles.bodyMuted, marginTop: theme.spacing.md },
});
