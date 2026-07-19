import { relations, sql } from 'drizzle-orm';
import {
    boolean,
    index,
    pgTable,
    text,
    timestamp,
    uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * user_sessions — one row per active device/browser session.
 *
 * This enables:
 *   - Multi-device login: multiple rows per user
 *   - Remote logout: delete a specific session row
 *   - "Logout all devices": delete all rows for a user
 *   - Device management UI: list active sessions with device info
 *   - Suspicious login detection: compare device/IP on each login
 *
 * The refresh token is stored as an argon2 hash — never plaintext.
 * Access tokens are stateless JWTs and do NOT live in this table.
 */
export const userSessions = pgTable(
    'user_sessions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),

        // Stored as argon2 hash of the raw refresh token
        refreshTokenHash: text('refresh_token_hash').notNull(),

        // Device fingerprint for display in "active sessions" UI
        deviceId: text('device_id'), // client-generated stable device ID
        deviceName: text('device_name'), // e.g. "Chrome on macOS"
        deviceType: text('device_type'), // "browser" | "mobile" | "desktop" | "api"
        userAgent: text('user_agent'),
        ipAddress: text('ip_address'),
        country: text('country'),
        city: text('city'),

        // Lifecycle
        isActive: boolean('is_active').notNull().default(true),
        lastActiveAt: timestamp('last_active_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        revokedAt: timestamp('revoked_at', { withTimezone: true }),
        revokedReason: text('revoked_reason'), // "logout" | "remote_logout" | "password_change" | "admin"

        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        userIdIdx: index('sessions_user_id_idx').on(t.userId),
        activeIdx: index('sessions_active_idx').on(t.userId, t.isActive),
        expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
    }),
);

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
