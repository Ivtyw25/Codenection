import React from 'react';
import { Text, type TextProps } from 'react-native';

import { fontFamily, type, useScheme, type TypeName } from '@/theme';

export interface TxtProps extends TextProps {
  variant?: TypeName;
  color?: string;
  center?: boolean;
  muted?: boolean;
}

/**
 * Substitutes a conventional percent sign for Neue Leiden's.
 *
 * The face draws `%` as two lining-figure-sized circles and a slash on a
 * 1,177-unit advance — more than twice the width of its `H` (538), with
 * counters the same size and weight as its `0`. At caption and label sizes
 * "83%" therefore reads as "830/0", which was visible on device the moment the
 * font went in. Shrinking it only made a wrong-looking symbol smaller.
 *
 * Every percentage in this app is a number the user is meant to act on —
 * Pressure, Vitality, task load, the Review sheet's budget — so legibility
 * outranks fidelity to the face for this one character. It is set in the
 * platform's own sans instead. The binary is licensed and untouched; this is
 * substitution at render time, not font surgery.
 *
 * `PERCENT_SCALE` reconciles the two faces' cap heights: Neue Leiden caps at
 * 660/1000 em, the system sans at roughly 710, so the borrowed glyph is set at
 * 0.93em to sit level with the digits beside it rather than towering over them.
 *
 * Doing this here rather than at call sites means it holds for every `%` in the
 * app — including the ones inside `Chip`, which only takes a string.
 */
const PERCENT_SCALE = 0.93;

function splitPercent(text: string, fontSize: number, keyPrefix: string): React.ReactNode[] {
  const parts = text.split('%');
  return parts.flatMap((part, i) =>
    i === parts.length - 1
      ? [part]
      : [
          part,
          <Text
            key={`${keyPrefix}-${i}`}
            style={{ fontFamily: fontFamily.system, fontSize: fontSize * PERCENT_SCALE }}
          >
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
function withReadablePercent(children: React.ReactNode, fontSize: number): React.ReactNode {
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
      {withReadablePercent(children, textStyle.fontSize)}
    </Text>
  );
}
