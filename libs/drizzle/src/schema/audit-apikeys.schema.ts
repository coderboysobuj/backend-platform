import { sql } from 'drizzle-orm';
import {
    index,
    pgTable,
    text,
    timestamp,
    uuid,
    boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { organizations } from './organizations.schema';

// ─── Audit Logs ──────────────────────────────────────────────────────────────

/**
 * audit_logs — immutable record of all significant actions.
 *
 * Written asynchronously via BullMQ (never blocks requests).
 * Queryable by admin for compliance, security review, and debugging.
 */
export const auditLogs = pgTable(
    'audit_logs',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        // Actor
        userId: uuid('user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        organizationId: uuid('organization_id').references(
            () => organizations.id,
            { onDelete: 'set null' },
        ),

        // What happened
        action: text('action').notNull(), // "user.login", "rbac.role_created", "payment.subscription_canceled"
        resource: text('resource').notNull(), // "user", "role", "subscription"
        resourceId: text('resource_id'), // UUID of affected entity

        // Before/after state (for change tracking)
        changes: text('changes'), // JSON: { before, after }

        // Request context
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        requestId: text('request_id'),

        // Result
        status: text('status').notNull().default('success'), // "success" | "failure"
        errorMessage: text('error_message'),

        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        userIdx: index('audit_user_idx').on(t.userId),
        orgIdx: index('audit_org_idx').on(t.organizationId),
        actionIdx: index('audit_action_idx').on(t.action),
        resourceIdx: index('audit_resource_idx').on(t.resource, t.resourceId),
        createdIdx: index('audit_created_idx').on(t.createdAt),
    }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ─── API Keys ────────────────────────────────────────────────────────────────

/**
 * api_keys — machine-to-machine authentication.
 *
 * The raw key is shown ONCE on creation and never stored.
 * We store a SHA-256 hash for lookup + bcrypt hash for verification.
 * (SHA-256 for fast indexed lookup; bcrypt for resistance to DB compromise.)
 */
export const apiKeys = pgTable(
    'api_keys',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        organizationId: uuid('organization_id').references(
            () => organizations.id,
            { onDelete: 'cascade' },
        ),

        name: text('name').notNull(), // human-readable label
        keyPrefix: text('key_prefix').notNull(), // first 8 chars shown in UI: "pk_xxxxx"
        keyHash: text('key_hash').notNull(), // SHA-256 for fast DB lookup
        keyBcrypt: text('key_bcrypt').notNull(), // bcrypt for verification

        // Scoped permissions — array of permission names this key has
        permissions: text('permissions').notNull().default('[]'),

        // Rate limiting and restrictions
        allowedIps: text('allowed_ips'), // JSON: null = any IP, ["1.2.3.4"] = restricted
        expiresAt: timestamp('expires_at', { withTimezone: true }),
        lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
        lastUsedIp: text('last_used_ip'),

        isActive: boolean('is_active').notNull().default(true),
        revokedAt: timestamp('revoked_at', { withTimezone: true }),
        revokedReason: text('revoked_reason'),

        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        keyHashIdx: index('api_keys_hash_idx').on(t.keyHash),
        userIdx: index('api_keys_user_idx').on(t.userId),
        orgIdx: index('api_keys_org_idx').on(t.organizationId),
    }),
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
