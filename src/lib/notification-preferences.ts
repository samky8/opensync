import { z } from 'zod';

export const notificationKinds = [
  'hoursDiscrepancy',
  'upcomingHoliday',
  'publishingIssue',
  'weeklySummary',
] as const;

export const notificationPreferencesSchema = z.object({
  hoursDiscrepancy: z.boolean(),
  upcomingHoliday: z.boolean(),
  publishingIssue: z.boolean(),
  weeklySummary: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const defaultNotificationPreferences: NotificationPreferences = {
  hoursDiscrepancy: false,
  upcomingHoliday: false,
  publishingIssue: false,
  weeklySummary: false,
};

export const notificationBits: Record<keyof NotificationPreferences, number> = {
  hoursDiscrepancy: 1,
  upcomingHoliday: 2,
  publishingIssue: 4,
  weeklySummary: 8,
};

export function preferencesFromMask(mask = 0): NotificationPreferences {
  return Object.fromEntries(
    notificationKinds.map((kind) => [kind, (mask & notificationBits[kind]) !== 0]),
  ) as NotificationPreferences;
}

export function preferencesToMask(preferences: NotificationPreferences) {
  return notificationKinds.reduce(
    (mask, kind) => mask | (preferences[kind] ? notificationBits[kind] : 0),
    0,
  );
}
