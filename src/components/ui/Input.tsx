import React, { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

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
import { Spinner } from './Spinner';
import { Txt } from './Txt';

export interface InputProps extends Omit<TextInputProps, 'onChange' | 'editable'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Non-empty puts the field in its error state and replaces the helper. */
  error?: string;
  helper?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** An in-flight action owns the field — transcription, autosave. */
  loading?: boolean;
  /** Shows "n / max" under the field and hard-caps input at `max`. */
  maxLength?: number;
  showCount?: boolean;
  required?: boolean;
}

/**
 * Five states: default, focused, error, disabled, loading.
 *
 * The focused ring is the lime glow the teardown flagged as worth keeping —
 * "an accent-colored focus ring that reinforces the brand instead of falling
 * back to the browser default" — and error takes precedence over it, so a
 * field that is both focused and invalid reads as invalid.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    value,
    onChangeText,
    error,
    helper,
    icon,
    disabled,
    loading,
    multiline,
    maxLength,
    showCount,
    required,
    style,
    ...props
  },
  ref,
) {
  const scheme = useScheme();
  const [focused, setFocused] = useState(false);

  const invalid = !!error;
  const inert = disabled || loading;

  const borderColor = invalid
    ? status.danger.solid
    : focused && !inert
      ? scheme.focus
      : scheme.border;

  const minHeight = Math.max(CONTROL_HEIGHT, MIN_TAP_TARGET);

  return (
    <View style={styles.container}>
      {label ? (
        <Txt variant="label" style={{ marginBottom: space[1] }}>
          {label}
          {required ? (
            <Txt variant="label" color={status.danger.fg}>
              {' *'}
            </Txt>
          ) : null}
        </Txt>
      ) : null}

      <View
        style={[
          styles.wrapper,
          {
            borderRadius: radius.md,
            borderColor,
            borderWidth: 1,
            backgroundColor: inert ? scheme.surfaceAlt : scheme.surface,
            minHeight,
            opacity: disabled ? 0.45 : 1,
          },
          focused && !invalid && !inert ? focusGlow : null,
        ]}
      >
        {icon ? <View style={{ paddingLeft: space[3] }}>{icon}</View> : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          editable={!inert}
          maxLength={maxLength}
          multiline={multiline}
          placeholderTextColor={scheme.textMuted}
          accessibilityLabel={label ?? props.placeholder}
          accessibilityState={{ disabled: inert }}
          // Announced alongside the field rather than only drawn in red.
          accessibilityHint={error ?? helper}
          style={[
            styles.input,
            type.body,
            { color: scheme.text, paddingHorizontal: space[3] },
            multiline && {
              minHeight: minHeight * 2,
              paddingTop: space[3],
              paddingBottom: space[3],
              textAlignVertical: 'top',
            },
            style,
          ]}
          {...props}
        />

        {loading ? (
          <View style={{ paddingRight: space[3] }}>
            <Spinner size={16} />
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          {error ? (
            <Txt variant="caption" color={status.danger.fg}>
              {error}
            </Txt>
          ) : helper ? (
            <Txt variant="caption" muted>
              {helper}
            </Txt>
          ) : null}
        </View>

        {showCount && maxLength ? (
          <Txt
            variant="caption"
            color={value.length >= maxLength ? status.warning.fg : scheme.textMuted}
          >
            {value.length} / {maxLength}
          </Txt>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%' },
  wrapper: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  input: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[1],
    minHeight: 16,
  },
});
