import { relations, sql } from 'drizzle-orm';
import {
  boolean, index, integer, pgEnum, pgTable,
  text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'manager', 'user']);
export const userStatusEnum = pgEnum('user_status', [
  'active', 'inactive', 'pending_verification', 'suspended', 'deleted',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identity
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),

  // System role (coarse-grained, separate from dynamic RBAC)
  systemRole: userRoleEnum('system_role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('pending_verification'),
  timezone: text('timezone').notNull().default('UTC'),
  locale: text('locale').notNull().default('en'),

  // Auth
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),

  // 2FA / TOTP
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  totpSecret: text('totp_secret'),       // AES-encrypted before storage
  backupCodes: text('backup_codes'),     // JSON array of hashed backup codes

  // Security
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastLoginIp: text('last_login_ip'),

  // Notification preferences (JSON string)
  notificationPreferences: text('notification_preferences')
    .notNull()
    .default('{"email":true,"push":true,"inApp":true}'),

  // Stripe customer
  stripeCustomerId: text('stripe_customer_id'),

  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  statusIdx: index('users_status_idx').on(t.status),
  stripeIdx: index('users_stripe_idx').on(t.stripeCustomerId),
}));

// Relations are declared in schema/index.ts after all tables are defined
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSystemRole = User['systemRole'];
export type UserStatus = User['status'];
