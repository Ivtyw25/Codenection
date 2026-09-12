import React from 'react';
import { Text, type TextProps } from 'react-native';

import { type, useScheme, type TypeName } from '@/theme';

export interface TxtProps extends TextProps {
  variant?: TypeName;
  color?: string;
  center?: boolean;
  muted?: boolean;
}

/**
 * Optical correction for Neue Leiden's percent sign.
 *
 * The face draws `%` as two lining-figure-sized circles and a slash on a
 * 1,177-unit advance — more than twice the width of its `H` (538), with
 * counters the same size and weight as its `0`. At caption and label sizes
 * "83%" therefore reads as "830/0", which was visible on device the moment the
 * font went in.
 *
 * The glyph is authentic and the binary is licensed, so neither gets edited.
 * Instead the symbol is set at 0.68em wherever it appears in a plain string,
 * which drops the circles below digit height and lets it read as punctuation.
 * Doing it here rather than at call sites means it holds for every `%` in the
 * app — including the ones inside `Chip`, which only takes a string.
 */
const PERCENT_SCALE = 0.68;

function splitPercent(text: string, fontSize: number, keyPrefix: string): React.ReactNode[] {
  const parts = text.split('%');
  return parts.flatMap((part, i) =>
    i === parts.length - 1
      ? [part]
      : [
          part,
          <Text key={`${keyPrefix}-${i}`} style={{ fontSize: fontSize * PERCENT_SCALE }}>
            %
          </Text>,
        ],
  );
}

/**
 * Handles both shapes JSX produces: a bare string child, and the array that
 * `{value}% left` compiles to. Anything else — nested elements, numbers alone —
 * passes through untouched.
 */
function withOpticalPercent(children: React.ReactNode, fontSize: number): React.ReactNode {
  if (typeof children === 'string') {
    return children.includes('%') ? splitPercent(children, fontSize, 'p') : children;
  }

  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string' && child.includes('%')
        ? splitPercent(child, fontSize, `p${i}`)
        : child,
    );
  }

  return children;
}

export function Txt({ variant = 'body', color, center, muted, style, children, ...props }: TxtProps) {
  const scheme = useScheme();

  const textColor = color ?? (muted ? scheme.textMuted : scheme.text);
  const textStyle = type[variant];

  return (
    <Text
      style={[textStyle, { color: textColor }, center && { textAlign: 'center' }, style]}
      {...props}
    >
      {withOpticalPercent(children, textStyle.fontSize)}
    </Text>
  );
}
