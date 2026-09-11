/**
 * SCR-21 — AI processing review (bottom sheet).
 * Route `/capture/review` · Goal: confirm AI-structured tasks before commit.
 *
 * This is the single combined Clarify + Organize pass. Two sequential review
 * screens is exactly the friction that stops people maintaining a GTD system,
 * so the AI does the mechanical sorting and the human does ONE lightweight
 * review (§B.2). Nothing enters the active list until this confirmation.
 */

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Pip } from '@/components/pip';
import { Button, Chip, DragHandle, SheetFooter, SheetShell, Skeleton, Txt, useToast } from '@/components/ui';
import { domainById, proposedTasks, trivialTasks } from '@/mock';
import { colors, elevation, radius, SCREEN_PADDING, space } from '@/theme';

export default function ReviewScreen() {
  const router = useRouter();
  const toast = useToast();

  const [processing, setProcessing] = useState(true);
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setProcessing(false), 1400);
    return () => clearTimeout(t);
  }, []);

  const accepted = proposedTasks.filter((t) => !rejected.has(t.id));

  return (
    <SheetShell height={0.92}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space[4] }}
      >
        <DragHandle />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
          <Pip
            size={64}
            pose={processing ? 'thinking' : 'listening'}
            accessibilityLabel={processing ? 'Pip is thinking' : 'Pip'}
          />
          <Txt variant="h3" style={{ flex: 1 }}>
            {processing ? 'Working through it…' : "Here's how I'd break this down."}
          </Txt>
        </View>

        {processing ? (
          <View style={{ gap: space[3], marginTop: space[4] }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={96} borderRadius={radius.lg} />
            ))}
          </View>
        ) : (
          <>
            <View style={{ gap: space[3], marginTop: space[4] }}>
              {accepted.map((task) => {
                const domain = domainById(task.domainId);
                return (
                  <View
                    key={task.id}
                    style={[
                      {
                        backgroundColor: colors.card,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14,
                        gap: space[2],
                      },
                      elevation[1],
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2] }}>
                      <Txt variant="h4" style={{ flex: 1 }}>
                        {task.title}
                      </Txt>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Reject ${task.title}`}
                        onPress={() => setRejected((s) => new Set(s).add(task.id))}
                        hitSlop={10}
                      >
                        <Feather name="x" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                      {domain ? (
                        <Chip label={domain.name} tint={domain.tint} />
                      ) : (
                        <Chip
                          label="New domain?"
                          tint={colors.semantic.info.fill}
                          textColor={colors.semantic.info.text}
                        />
                      )}
                      {task.due ? <Chip label={task.due} /> : null}
                      {task.effortMinutes ? (
                        <Chip
                          label={`${task.effortMinutes} min`}
                          leading={
                            task.lowConfidenceEstimate ? (
                              <Feather
                                name="help-circle"
                                size={12}
                                color={colors.textSecondary}
                              />
                            ) : undefined
                          }
                        />
                      ) : null}
                    </View>

                    {/* Split items show their sub-tasks indented. */}
                    {task.subTasks?.length ? (
                      <View style={{ marginTop: space[1], gap: space[1], paddingLeft: space[3] }}>
                        {task.subTasks.map((s) => (
                          <View
                            key={s.id}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}
                          >
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: radius.full,
                                backgroundColor: colors.borderStrong,
                              }}
                            />
                            <Txt variant="bodySm" color={colors.textSecondary}>
                              {s.title}
                            </Txt>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* 2-minute rule — listed separately, never scheduled. */}
            {trivialTasks.length > 0 ? (
              <View style={{ marginTop: space[5], gap: space[2] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                  <Feather name="zap" size={16} color={colors.brand.accentText} />
                  <Txt variant="h4">Just do it now</Txt>
                </View>
                <Txt variant="bodySm" color={colors.textSecondary}>
                  Under two minutes each — not worth scheduling.
                </Txt>
                {trivialTasks.map((t) => (
                  <View
                    key={t.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}
                  >
                    <Feather name="zap" size={12} color={colors.brand.accentText} />
                    <Txt variant="bodyMd">{t.title}</Txt>
                  </View>
                ))}
              </View>
            ) : null}

            {accepted.length === 0 ? (
              <Txt variant="bodyMd" color={colors.textSecondary} style={{ marginTop: space[5] }}>
                I didn&apos;t find any clear tasks — want to save this as a note?
              </Txt>
            ) : null}
          </>
        )}
      </ScrollView>

      <SheetFooter>
        <Button
          label={accepted.length > 0 ? `Add ${accepted.length} tasks` : 'Save as a note'}
          disabled={processing}
          onPress={() => {
            toast.show('+10 Sparks', 'spark');
            router.dismissAll();
          }}
        />
        <Button label="Edit more" variant="text" disabled={processing} onPress={() => {}} />
      </SheetFooter>
    </SheetShell>
  );
}
