/**
 * Input field — 52px, `--radius-md`, `--card`, 1px `--border`.
 * Focus: 2px `--brand-primary` ring. Error: 1.5px destructive border plus a
 * Body-SM message 4px below, led by a 16px `alert-circle`. Success: 1.5px
 * success border + `check`. Char counter is Caption `--text-secondary`, turning
 * `--destructive-text` at the limit (Appendix).
 */

import { useState } from 'react';
import { TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { brand, colors, CONTROL_HEIGHT, radius, space, type } from '@/theme';
import { Txt } from './Txt';

export interface InputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  /** Shows the counter once the field has been typed into. */
  showCounter?: boolean;
  error?: string;
  success?: boolean;
  multiline?: boolean;
  minHeight?: number;
  autoFocus?: boolean;
  centerText?: boolean;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  maxLength,
  showCounter,
  error,
  success,
  multiline,
  minHeight,
  autoFocus,
  centerText,
  textStyle,
  style,
  accessibilityLabel,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const atLimit = maxLength != null && value.length >= maxLength;

  let borderColor: string = colors.border;
  let borderWidth = 1;
  if (error) {
    borderColor = colors.semantic.destructive.solid;
    borderWidth = 1.5;
  } else if (success) {
    borderColor = colors.semantic.success.solid;
    borderWidth = 1.5;
  } else if (focused) {
    borderColor = brand.primary;
    borderWidth = 2;
  }

  return (
    <View style={style}>
      <View
        style={{
          minHeight: minHeight ?? CONTROL_HEIGHT,
          borderRadius: radius.md,
          backgroundColor: colors.card,
          borderWidth,
          borderColor,
          paddingHorizontal: space[4],
          justifyContent: 'center',
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
        }}
      >
        <TextInput
          accessibilityLabel={accessibilityLabel ?? placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          maxLength={maxLength}
          multiline={multiline}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            type.bodyMd,
            {
              flex: 1,
              color: colors.text,
              paddingVertical: multiline ? space[3] : 0,
              textAlign: centerText ? 'center' : 'left',
              textAlignVertical: multiline ? 'top' : 'center',
            },
            textStyle,
          ]}
        />
        {success && !error ? (
          <Feather name="check" size={16} color={colors.semantic.success.solid} />
        ) : null}
      </View>

      {/* Counter appears only after the first keystroke. */}
      {showCounter && maxLength != null && value.length > 0 ? (
        <Txt
          variant="caption"
          color={atLimit ? colors.semantic.destructive.text : colors.textSecondary}
          style={{ alignSelf: 'flex-end', marginTop: space[1] }}
        >
          {value.length}/{maxLength}
        </Txt>
      ) : null}

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[1],
            marginTop: space[1],
          }}
        >
          <Feather name="alert-circle" size={16} color={colors.semantic.destructive.text} />
          <Txt variant="bodySm" color={colors.semantic.destructive.text}>
            {error}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
