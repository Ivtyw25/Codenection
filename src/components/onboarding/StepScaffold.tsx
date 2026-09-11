/**
 * Shared chrome for every onboarding step (SCR-01–09).
 *
 * Progress header (fixed) → step body (scroll) → sticky footer nav.
 * The 9 segments correspond to the step sequence in
 * `pip-onboarding-and-gtd.md` §A.2; step 8 (silent calibration) has no screen
 * but still occupies a segment, because progress should reflect the real work
 * the system is doing.
 */

import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { Button, Txt } from '@/components/ui';
import {
  brand,
  colors,
  HEADER_HEIGHT,
  MIN_TAP_TARGET,
  radius,
  SCREEN_PADDING,
  space,
} from '@/theme';

export const ONBOARDING_STEPS = 9;

export interface StepScaffoldProps {
  /** 1-based step index, for the segmented progress bar. */
  step: number;
  children: React.ReactNode;
  ctaLabel: string;
  onContinue: () => void;
  /** Footer stays disabled until the step's minimum input is satisfied. */
  ctaDisabled?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  /** Renders the body without a ScrollView — used by the chat step. */
  scroll?: boolean;
  footerExtra?: React.ReactNode;
}

export function StepScaffold({
  step,
  children,
  ctaLabel,
  onContinue,
  ctaDisabled,
  onBack,
  onSkip,
  skipLabel = 'Skip',
  scroll = true,
  footerExtra,
}: StepScaffoldProps) {
  const insets = useSafeAreaInsets();

  const body = (
    <View style={{ flex: 1, paddingHorizontal: SCREEN_PADDING }}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Progress header. */}
      <View
        style={{
          height: HEADER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space[2],
          gap: space[2],
        }}
      >
        <View style={{ width: MIN_TAP_TARGET, height: MIN_TAP_TARGET, justifyContent: 'center' }}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={{ width: MIN_TAP_TARGET, height: MIN_TAP_TARGET, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="chevron-left" size={24} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}
          style={{ flex: 1, flexDirection: 'row', gap: 4 }}
        >
          {Array.from({ length: ONBOARDING_STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: radius.full,
                backgroundColor: i < step ? brand.primary : colors.muted,
              }}
            />
          ))}
        </View>

        <View style={{ minWidth: MIN_TAP_TARGET, alignItems: 'flex-end' }}>
          {onSkip ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
              onPress={onSkip}
              style={{ height: MIN_TAP_TARGET, justifyContent: 'center', paddingHorizontal: space[2] }}
            >
              <Txt variant="h4" color={colors.actionQuiet}>
                {skipLabel}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Step body. */}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: space[5] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}

      {/* Sticky footer. */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[3],
          paddingBottom: insets.bottom + space[4],
          gap: space[2],
        }}
      >
        {footerExtra}
        <Button label={ctaLabel} disabled={ctaDisabled} onPress={onContinue} />
      </View>
    </View>
  );
}
