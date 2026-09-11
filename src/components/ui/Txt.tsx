/**
 * Typography component. Every piece of text in the app goes through this so the
 * type scale in `pip-design-spec.md` §1.2 is the only way to size text.
 */

import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

import { colors, type as typeScale, type TypeName } from '@/theme';

export interface TxtProps extends TextProps {
  /** Token from the type scale. Defaults to Body-MD. */
  variant?: TypeName;
  /** Any colour token. Defaults to `--color-text`. */
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Txt({
  variant = 'bodyMd',
  color = colors.text,
  center,
  style,
  ...rest
}: TxtProps) {
  return (
    <Text
      {...rest}
      style={[typeScale[variant], { color }, center && { textAlign: 'center' }, style]}
    />
  );
}
