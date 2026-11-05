import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { Schedule } from '@/lib/domain';
const created = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
export const socialOauth = pgTable('social_oauth', {
  stateHash: text('state_hash').primaryKey(),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const socialAccounts = pgTable(
  'social_accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    pageId: text('page_id').notNull(),
    name: text().notNull(),
    instagramId: text('instagram_id'),
    instagramName: text('instagram_name'),
    instagramType: text('instagram_type'),
    encryptedToken: text('encrypted_token').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('social_accounts_location_id_page_id_key').on(t.locationId, t.pageId)],
);
export const socialPublications = pgTable('social_publications', {
  id: uuid().primaryKey(),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => socialAccounts.id, { onDelete: 'set null' }),
  accountName: text('account_name').notNull(),
  platform: text().notNull(),
  format: text().notNull(),
  caption: text().notNull(),
  payloadHash: text('payload_hash').notNull(),
  image: text(),
  mediaKey: text('media_key').notNull().unique(),
  mediaExpiresAt: timestamp('media_expires_at', { withTimezone: true }).notNull(),
  status: text().notNull(),
  containerId: text('container_id'),
  remoteId: text('remote_id'),
  error: text(),
  createdAt: created(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const organizations = pgTable('organizations', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  createdAt: created(),
});
export const memberships = pgTable(
  'memberships',
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: text().notNull().default('owner'),
  },
  (t) => [
    uniqueIndex('member_unique').on(t.organizationId, t.userId),
    index('member_user').on(t.userId),
  ],
);
export const locations = pgTable('locations', {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  draft: jsonb().$type<Schedule>().notNull(),
  draftVersion: integer('draft_version').notNull().default(1),
  publishedVersion: integer('published_version').notNull().default(0),
  onboardingStep: integer('onboarding_step').notNull().default(1),
  createdAt: created(),
});
export const revisions = pgTable(
  'revisions',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    snapshot: jsonb().$type<Schedule>().notNull(),
    actorId: uuid('actor_id'),
    idempotencyKey: uuid('idempotency_key').notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex('revision_version').on(t.locationId, t.version),
    uniqueIndex('revision_idempotency').on(t.locationId, t.idempotencyKey),
  ],
);
export const jobs = pgTable(
  'jobs',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => revisions.id, { onDelete: 'cascade' }),
    destination: text().notNull(),
    status: text().notNull().default('queued'),
    attempts: integer().notNull().default(0),
    nextAttempt: timestamp('next_attempt', { withTimezone: true }).defaultNow().notNull(),
    lastAttempt: timestamp('last_attempt', { withTimezone: true }),
    error: text(),
    createdAt: created(),
  },
  (t) => [index('job_due').on(t.status, t.nextAttempt)],
);
export const connections = pgTable('connections', {
  locationId: uuid('location_id')
    .primaryKey()
    .references(() => locations.id, { onDelete: 'cascade' }),
  provider: text().notNull().default('google'),
  encryptedTokens: text('encrypted_tokens').notNull(),
  remoteId: text('remote_id'),
  status: text().notNull().default('select_location'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const subscriptions = pgTable('subscriptions', {
  organizationId: uuid('organization_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').unique(),
  subscriptionId: text('subscription_id'),
  checkoutSessionId: text('checkout_session_id'),
  plan: text().notNull().default('free'),
  status: text().notNull().default('inactive'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const proTrials = pgTable('pro_trials', {
  organizationId: uuid('organization_id')
    .primaryKey()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  claimedBy: uuid('claimed_by').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
});
export const activity = pgTable('activity', {
  id: uuid().primaryKey().defaultRandom(),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id'),
  message: text().notNull(),
  createdAt: created(),
});
export const notifications = pgTable('notifications', {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  message: text().notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: created(),
});
export const interests = pgTable(
  'interests',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    feature: text().notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex('interest_unique').on(t.userId, t.feature)],
);
export const support = pgTable('support', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  message: text().notNull(),
  createdAt: created(),
});
export const preferences = pgTable('preferences', {
  userId: uuid('user_id').primaryKey(),
  emailNotifications: integer('email_notifications').notNull().default(0),
});
