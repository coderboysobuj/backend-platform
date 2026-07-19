import { sql } from 'drizzle-orm';
import {
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const tokenTypeEnum = pgEnum('token_type', [
    'email_verification',
    'password_reset',
    'organization_invite',
    'magic_link',
    'email_change',
]);

/**
 * user_tokens — all short-lived, single-use secure tokens.
 *
 * Raw token is never stored — only an argon2 hash.
 * The flow: generate raw token → email it → hash it → store hash.
 * On verify: hash the submitted token → compare with stored hash.
 */
export const userTokens = pgTable(
    'user_tokens',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: tokenTypeEnum('type').notNull(),
        tokenHash: text('token_hash').notNull(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        usedAt: timestamp('used_at', { withTimezone: true }),
        // Extra context (e.g. new email for email_change, org id for invite)
        metadata: text('metadata'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        userTypeIdx: index('tokens_user_type_idx').on(t.userId, t.type),
        expiresIdx: index('tokens_expires_idx').on(t.expiresAt),
    }),
);

export type UserToken = typeof userTokens.$inferSelect;
export type NewUserToken = typeof userTokens.$inferInsert;
export type TokenType = UserToken['type'];
