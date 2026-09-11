import React, { ReactNode, useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import {
  CONTROL_HEIGHT,
  MIN_TAP_TARGET,
  focusGlow,
  radius,
  space,
  status,
  type,
  useScheme,
} from '@/theme';
import { Txt } from './Txt';

export interface InputProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helper?: string;
  icon?: ReactNode;
}

export function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  icon,
  multiline,
  style,
  ...props
}: InputProps) {
  const scheme = useScheme();
  const [focused, setFocused] = useState(false);
  
  const borderColor = error ? status.danger.solid : (focused ? scheme.focus : scheme.border);

  return (
    <View style={styles.container}>
      {label && <Txt variant="label" style={{ marginBottom: space[1] }}>{label}</Txt>}
      <View style={[
        styles.inputWrapper,
        {
          borderRadius: radius.md,
          borderColor,
          borderWidth: 1,
          backgroundColor: scheme.surface,
          minHeight: Math.max(CONTROL_HEIGHT, MIN_TAP_TARGET),
        },
        focused && !error && focusGlow,
      ]}>
        {icon && <View style={[styles.icon, { paddingLeft: space[3] }]}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={scheme.textMuted}
          multiline={multiline}
          accessibilityLabel={label || props.placeholder}
          accessibilityRole="none"
          style={[
            styles.input,
            type.body,
            { color: scheme.text, paddingHorizontal: space[3] },
            multiline && { minHeight: Math.max(CONTROL_HEIGHT, MIN_TAP_TARGET), paddingTop: space[3], paddingBottom: space[3] },
            style
          ]}
          {...props}
        />
      </View>
      {error ? (
        <Txt variant="caption" color={status.danger.fg} style={{ marginTop: space[1] }}>{error}</Txt>
      ) : helper ? (
        <Txt variant="caption" color={scheme.textMuted} style={{ marginTop: space[1] }}>{helper}</Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  icon: {},
  input: {
    flex: 1,
    fontSize: 16,
  },
});
