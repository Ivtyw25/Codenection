import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Archive, ArchiveRestore, Check, Plus, X } from 'lucide-react-native';

import { LoadBreakdown, TaskIcon } from '@/components/app';
import {
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  Interactive,
  Txt,
} from '@/components/ui';
import { CATEGORY_ICONS } from '@/data/categories';
import { useApp } from '@/store/AppStore';
import { useAllCategories, useLoadBreakdown } from '@/store/selectors';
import { radius, space, useScheme } from '@/theme';
import type { Category, IconName } from '@/types';

/**
 * The categories screen.
 *
 * Cycle #1 made categories the user's data in the model and then gave them no
 * way to touch it — which meant "your categories" was true of the types and
 * false of the app. This is the other half.
 *
 * Three decisions worth stating:
 *
 * RETIRE, NEVER DELETE. A category with history under it is the only record of
 * what a month was made of. Deleting "Club" in November would quietly rewrite
 * October. Archiving stops it being offered on new work and drops it out of the
 * breakdown once nothing open carries it, while Reflect keeps its past intact.
 * That is why there is an Archive control here and no Delete.
 *
 * SHAREABLE IS A REAL QUESTION, ASKED ONCE. The Rebalancer's delegate lever
 * needs to know whether work in an area is the kind somebody else could take.
 * Asking per task would be a chore; asking per category is one decision that
 * covers a whole region of a life. The copy says what it is actually for.
 *
 * THE LOAD IS SHOWN HERE TOO. A list of labels is administration. The same list
 * with what each one is currently costing is a decision aid — it is where
 * somebody notices that the category they were about to rename is the one
 * carrying half their week.
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const scheme = useScheme();

  const { addCategory, patchCategory, archiveCategory, toast } = useApp();
  const categories = useAllCategories();
  const breakdown = useLoadBreakdown();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftIcon, setDraftIcon] = useState<IconName>('Sparkles');

  const active = useMemo(() => categories.filter((c) => !c.archived), [categories]);
  const archived = useMemo(() => categories.filter((c) => c.archived), [categories]);

  /** Points of pressure per category, so a row can show what it costs. */
  const loadById = useMemo(() => {
    const map = new Map<string, number>();
    for (const slice of breakdown.slices) map.set(slice.categoryId, slice.value);
    return map;
  }, [breakdown.slices]);

  const submit = () => {
    const label = draft.trim();
    if (label.length < 2) return;
    addCategory(label, draftIcon);
    Haptics.selectionAsync().catch(() => {});
    toast(`“${label}” added`, 'success');
    setDraft('');
    setDraftIcon('Sparkles');
    setAdding(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: scheme.ground }}>
      <View style={styles.head}>
        <IconButton
          icon={<ArrowLeft size={18} color={scheme.text} />}
          accessibilityLabel="Go back"
          size={40}
          onPress={() => router.back()}
        />
        <View style={{ flex: 1 }}>
          <Txt variant="caption" muted style={styles.eyebrow}>
            WHAT YOU CARRY
          </Txt>
          <Txt variant="h4">Categories</Txt>
        </View>
        {!adding ? (
          <IconButton
            icon={<Plus size={18} color={scheme.text} />}
            accessibilityLabel="Add a category"
            size={40}
            onPress={() => setAdding(true)}
          />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Txt variant="bodySm" muted>
          Your load is broken down by these. Rename them to whatever you actually
          call them — nothing else in the app depends on the words.
        </Txt>

        {/* ── Add ───────────────────────────────────────────────────────── */}
        {adding ? (
          <Card style={styles.addCard}>
            <Input
              value={draft}
              onChangeText={setDraft}
              autoFocus
              maxLength={24}
              showCount
              placeholder="Placement, Band, Mum's stuff…"
              accessibilityLabel="New category name"
            />

            <Txt variant="caption" muted>
              Pick an icon
            </Txt>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map((icon) => {
                const selected = icon === draftIcon;
                return (
                  <Interactive
                    key={icon}
                    accessibilityRole="button"
                    accessibilityLabel={`Icon ${icon}`}
                    accessibilityState={{ selected }}
                    onPress={() => setDraftIcon(icon)}
                    radius="pill"
                    style={[
                      styles.iconChoice,
                      {
                        backgroundColor: selected ? scheme.primary : scheme.surfaceAlt,
                        borderColor: selected ? scheme.primary : scheme.border,
                      },
                    ]}
                  >
                    <TaskIcon
                      name={icon}
                      size={17}
                      color={selected ? scheme.onPrimary : scheme.textSecondary}
                    />
                  </Interactive>
                );
              })}
            </View>

            <View style={styles.addActions}>
              <Button
                label="Cancel"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setAdding(false);
                  setDraft('');
                }}
              />
              <Button
                label="Add category"
                variant="primary"
                size="sm"
                disabled={draft.trim().length < 2}
                icon={<Check size={15} color={scheme.onPrimary} />}
                onPress={submit}
              />
            </View>
          </Card>
        ) : null}

        {/* ── Active ────────────────────────────────────────────────────── */}
        {active.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            load={loadById.get(category.id) ?? 0}
            onRename={(label) => {
              patchCategory(category.id, { label });
              toast('Renamed', 'success');
            }}
            onShareable={(shareable) => {
              patchCategory(category.id, { shareable });
              Haptics.selectionAsync().catch(() => {});
            }}
            onArchive={() => {
              archiveCategory(category.id, true);
              toast(`“${category.label}” retired`, 'neutral', {
                label: 'Undo',
                run: () => archiveCategory(category.id, false),
              });
            }}
          />
        ))}

        {/* ── Retired ───────────────────────────────────────────────────── */}
        {archived.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Txt variant="h4">Retired</Txt>
              <Txt variant="caption" muted>
                Not offered on new work. Their history is intact.
              </Txt>
            </View>

            {archived.map((category) => (
              <Card key={category.id} style={styles.retiredRow}>
                <View style={[styles.badge, { backgroundColor: scheme.surfaceAlt }]}>
                  <TaskIcon name={category.icon} size={15} color={scheme.textMuted} />
                </View>
                <Txt variant="h4" style={{ flex: 1 }} muted>
                  {category.label}
                </Txt>
                <Button
                  label="Restore"
                  variant="secondary"
                  size="sm"
                  icon={<ArchiveRestore size={14} color={scheme.primary} />}
                  onPress={() => {
                    archiveCategory(category.id, false);
                    toast(`“${category.label}” restored`, 'success');
                  }}
                />
              </Card>
            ))}
          </>
        ) : null}

        {/* ── The breakdown, for context ────────────────────────────────── */}
        {breakdown.slices.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Txt variant="h4">Right now</Txt>
              <Txt variant="caption" muted>
                What each one is costing you today.
              </Txt>
            </View>
            <Card>
              <LoadBreakdown total={breakdown.total} slices={breakdown.slices} />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * One category, editable in place.
 *
 * The name is a text field rather than a row that opens an edit screen: it is a
 * single short string, and a navigation round-trip to change one word is the
 * kind of friction this app is supposed to be removing.
 */
function CategoryRow({
  category,
  load,
  onRename,
  onShareable,
  onArchive,
}: {
  category: Category;
  load: number;
  onRename: (label: string) => void;
  onShareable: (shareable: boolean) => void;
  onArchive: () => void;
}) {
  const scheme = useScheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.label);

  const commit = () => {
    const next = draft.trim();
    // A rename to nothing is a slip, not an instruction — fall back rather than
    // leaving the user with an unnamed row they then have to repair.
    if (next.length >= 2 && next !== category.label) onRename(next);
    else setDraft(category.label);
    setEditing(false);
  };

  return (
    <Card style={styles.row}>
      <View style={styles.rowHead}>
        <View style={[styles.badge, { backgroundColor: scheme.surfaceAlt }]}>
          <TaskIcon name={category.icon} size={15} color={scheme.primary} />
        </View>

        {editing ? (
          <Input
            value={draft}
            onChangeText={setDraft}
            autoFocus
            maxLength={24}
            onBlur={commit}
            accessibilityLabel={`Rename ${category.label}`}
            style={{ flex: 1 }}
          />
        ) : (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={`${category.label}. Carrying ${load} pressure. Tap to rename.`}
            onPress={() => {
              setDraft(category.label);
              setEditing(true);
            }}
            radius="sm"
            style={{ flex: 1 }}
          >
            <Txt variant="h4">{category.label}</Txt>
          </Interactive>
        )}

        {!editing && load > 0 ? (
          <Chip label={`${load}`} size="sm" tone={load >= 25 ? 'warning' : 'neutral'} />
        ) : null}

        {editing ? (
          <IconButton
            icon={<X size={16} color={scheme.textMuted} />}
            accessibilityLabel="Cancel rename"
            size={34}
            tone="ghost"
            onPress={() => {
              setDraft(category.label);
              setEditing(false);
            }}
          />
        ) : (
          <IconButton
            icon={<Archive size={15} color={scheme.textMuted} />}
            accessibilityLabel={`Retire ${category.label}`}
            size={34}
            tone="ghost"
            onPress={onArchive}
          />
        )}
      </View>

      {/*
        Phrased as the question the Rebalancer actually asks, not as a setting
        name. "Shareable: on" would tell nobody what it changes.
      */}
      <View style={[styles.shareRow, { borderTopColor: scheme.border }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="bodySm">Someone else could do this</Txt>
          <Txt variant="caption" muted>
            {category.shareable
              ? 'Pip may offer to hand these off when your week is over.'
              : 'Pip will never suggest delegating this.'}
          </Txt>
        </View>
        <Switch
          value={Boolean(category.shareable)}
          onValueChange={onShareable}
          accessibilityLabel={`Work in ${category.label} can be delegated`}
          trackColor={{ true: scheme.primary, false: scheme.borderStrong }}
          thumbColor={scheme.surface}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[10],
    paddingBottom: space[3],
  },
  eyebrow: { letterSpacing: 1 },
  scroll: { paddingHorizontal: space[4], paddingBottom: space[10], gap: space[3] },

  addCard: { gap: space[3] },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },

  row: { gap: space[3] },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderTopWidth: 1,
    paddingTop: space[3],
  },

  sectionHead: { gap: space[0.5], marginTop: space[2], paddingHorizontal: space[1] },
  retiredRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
