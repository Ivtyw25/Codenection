import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useScheme, space, status, radius } from '@/theme';
import { Txt } from './Txt';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react-native';

export interface ErrorStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  onRetry?: () => void;
}

export function ErrorState({ icon, title, body, action, onRetry }: ErrorStateProps) {
  const scheme = useScheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: status.danger.bg, borderRadius: radius.pill, padding: space[4] }]}>
        {icon || <AlertCircle size={32} color={status.danger.solid} />}
      </View>
      <Txt variant="h3" center style={{ marginBottom: space[2] }}>{title}</Txt>
      {body && (
        <Txt variant="body" color={scheme.textSecondary} center style={{ marginBottom: space[6] }}>
          {body}
        </Txt>
      )}
      <View style={styles.actions}>
        {onRetry && (
          <Button label="Try again" onPress={onRetry} variant="secondary" />
        )}
        {action && (
          <Button label={action.label} onPress={action.onPress} variant="primary" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[10],
    paddingHorizontal: space[4],
  },
  iconContainer: {
    marginBottom: space[4],
  },
  actions: {
    flexDirection: 'row',
    gap: space[2],
  },
});
