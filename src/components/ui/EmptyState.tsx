import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useScheme, space } from '@/theme';
import { Txt } from './Txt';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const scheme = useScheme();

  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Txt variant="h3" center style={{ marginBottom: space[2] }}>{title}</Txt>
      {body && (
        <Txt variant="body" color={scheme.textSecondary} center style={{ marginBottom: space[6] }}>
          {body}
        </Txt>
      )}
      {action && (
        <Button label={action.label} onPress={action.onPress} variant="secondary" />
      )}
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
});
