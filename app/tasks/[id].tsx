/**
 * SCR-13 — Task detail (bottom sheet).
 * Route `/tasks/:id` · Goal: view/edit one task.
 *
 * Rescheduled tasks retain their original category and notes; completed ones
 * move to a history log and feed calibration.
 */

import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Button, Chip, DragHandle, SheetFooter, SheetShell, Txt, useToast } from '@/components/ui';
import { domainById, manifest } from '@/mock';
import {
  colors,
  radius,
  SCREEN_PADDING,
  space,
  type as typeScale,
} from '@/theme';

export default function TaskDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const task = manifest.find((t) => t.id === id) ?? manifest[0];
  const domain = domainById(task.domainId);

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [subDone, setSubDone] = useState<Set<string>>(
    new Set(task.subTasks?.filter((s) => s.done).map((s) => s.id) ?? []),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <SheetShell height={0.9}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space[4] }}
        keyboardShouldPersistTaps="handled"
      >
        <DragHandle />

        {/* 2 — Editable title. */}
        <TextInput
          accessibilityLabel="Task title"
          value={title}
          onChangeText={setTitle}
          multiline
          style={[typeScale.h2, { color: colors.text, padding: 0 }]}
        />

        {/* 3 — Meta row. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[3] }}>
          {domain ? <Chip label={domain.name} tint={domain.tint} /> : null}
          {task.due ? (
            <Chip
              label={task.due}
              leading={<Feather name="calendar" size={12} color={colors.textSecondary} />}
            />
          ) : null}
          {task.context ? <Chip label={task.context} /> : null}
        </View>

        {/* 4 — Sub-task checklist. */}
        {task.subTasks?.length ? (
          <View style={{ marginTop: space[5], gap: space[3] }}>
            <Txt variant="h4">Steps</Txt>
            {task.subTasks.map((s) => {
              const done = subDone.has(s.id);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={s.title}
                  onPress={() =>
                    setSubDone((cur) => {
                      const next = new Set(cur);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      return next;
                    })
                  }
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: radius.sm,
                      borderWidth: done ? 0 : 2,
                      borderColor: colors.borderStrong,
                      backgroundColor: done ? colors.semantic.success.solid : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {done ? <Feather name="check" size={14} color={colors.onFill} /> : null}
                  </View>
                  <Txt
                    variant="bodyMd"
                    color={done ? colors.textDisabled : colors.text}
                    style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}
                  >
                    {s.title}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* 5 — Notes. */}
        <Txt variant="h4" style={{ marginTop: space[5], marginBottom: space[2] }}>
          Notes
        </Txt>
        <TextInput
          accessibilityLabel="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Anything worth remembering."
          placeholderTextColor={colors.textDisabled}
          style={[
            typeScale.bodyMd,
            {
              minHeight: 88,
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: space[3],
              color: colors.text,
              textAlignVertical: 'top',
            },
          ]}
        />

        {/* Inline delete confirmation, never a separate dialog. */}
        {confirmingDelete ? (
          <View
            style={{
              marginTop: space[4],
              backgroundColor: colors.semantic.destructive.fill,
              borderRadius: radius.md,
              padding: space[3],
              gap: space[3],
            }}
          >
            <Txt variant="bodyMd" color={colors.semantic.destructive.text}>
              Delete this task?
            </Txt>
            <View style={{ flexDirection: 'row', gap: space[3] }}>
              <Button
                label="Cancel"
                variant="text"
                full={false}
                onPress={() => setConfirmingDelete(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Delete"
                variant="destructive"
                full={false}
                onPress={() => router.back()}
                style={{ flex: 1, height: 44 }}
              />
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete task"
            onPress={() => setConfirmingDelete(true)}
            style={{ marginTop: space[4], alignSelf: 'flex-start', padding: space[2] }}
          >
            <Txt variant="bodySm" color={colors.semantic.destructive.text}>
              Delete
            </Txt>
          </Pressable>
        )}
      </ScrollView>

      <SheetFooter>
        <Button
          label="Complete"
          onPress={() => {
            toast.show('+1 Care', 'care');
            router.back();
          }}
        />
        <Button label="Reschedule" variant="text" onPress={() => router.back()} />
      </SheetFooter>
    </SheetShell>
  );
}
