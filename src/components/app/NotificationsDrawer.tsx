import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BellOff, Gift, Info, Sparkles } from 'lucide-react-native';

import { Drawer, EmptyState, Interactive, Txt } from '@/components/ui';
import { formatRelative } from '@/data/format';
import { useApp } from '@/store/AppStore';
import { radius, space, status, useScheme } from '@/theme';
import type { NotificationKind } from '@/types';

const ICON: Record<NotificationKind, typeof Info> = {
  nudge: Sparkles,
  reward: Gift,
  system: Info,
};

const TONE: Record<NotificationKind, 'warning' | 'success' | 'info'> = {
  nudge: 'warning',
  reward: 'success',
  system: 'info',
};

/**
 * The bell's destination.
 *
 * A Drawer rather than a route: it is transient, belongs to whichever screen
 * opened it, and nobody deep-links to their own notification list.
 */
export function NotificationsDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scheme = useScheme();
  const { data, markNotificationsRead, toast } = useApp();

  const unread = data.notifications.filter((notification) => !notification.read).length;

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title="Notifications"
      headerAction={
        unread > 0 ? (
          <Interactive
            accessibilityRole="button"
            accessibilityLabel={`Mark all ${unread} as read`}
            onPress={() => {
              markNotificationsRead();
              toast('All caught up', 'success');
            }}
            radius="pill"
            style={styles.markAll}
          >
            <Txt variant="label" color={scheme.primary}>
              Mark all read
            </Txt>
          </Interactive>
        ) : null
      }
    >
      {data.notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff size={28} color={scheme.textMuted} />}
          title="Nothing waiting"
          body="Pip only interrupts when something has actually changed."
        />
      ) : (
        <View style={{ gap: space[2] }}>
          {data.notifications.map((notification) => {
            const Icon = ICON[notification.kind];
            const tone = TONE[notification.kind];

            return (
              <View
                key={notification.id}
                accessibilityRole="text"
                accessibilityLabel={`${notification.title}. ${notification.body}. ${formatRelative(notification.createdAt)}${notification.read ? '' : '. Unread'}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: notification.read ? scheme.surface : status[tone].bg,
                    borderColor: notification.read ? scheme.border : 'transparent',
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: scheme.surface }]}>
                  <Icon size={15} color={status[tone].solid} />
                </View>

                <View style={{ flex: 1, gap: space[0.5] }}>
                  <View style={styles.titleRow}>
                    <Txt variant="h4" style={{ flex: 1 }} numberOfLines={1}>
                      {notification.title}
                    </Txt>
                    <Txt variant="caption" muted>
                      {formatRelative(notification.createdAt)}
                    </Txt>
                  </View>
                  <Txt variant="bodySm" muted>
                    {notification.body}
                  </Txt>
                </View>

                {!notification.read ? (
                  <View style={[styles.dot, { backgroundColor: status[tone].solid }]} />
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Drawer>
  );
}

const styles = StyleSheet.create({
  markAll: { paddingHorizontal: space[2], paddingVertical: space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2.5],
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: radius.pill, marginTop: space[1] },
});
