import { sql } from 'drizzle-orm';
import {
    boolean,
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { organizations } from './organizations.schema';

export const notificationTypeEnum = pgEnum('notification_type', [
    'info',
    'success',
    'warning',
    'error',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
    'in_app',
    'email',
    'push',
    'sms',
]);

/**
 * notifications — in-app notification store.
 *
 * Delivery channels:
 *   - in_app: stored here, pushed via WebSocket on connect
 *   - email: dispatched as BullMQ job (EmailProcessor)
 *   - push: dispatched as BullMQ job (PushProcessor) — future
 *
 * Each notification links to an actor (who triggered it),
 * a recipient (userId), and optionally an organization context.
 */
export const notifications = pgTable(
    'notifications',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        organizationId: uuid('organization_id').references(
            () => organizations.id,
            { onDelete: 'set null' },
        ),

        type: notificationTypeEnum('type').notNull().default('info'),

        // Content
        title: text('title').notNull(),
        body: text('body').notNull(),
        // Deep-link for frontend navigation
        actionUrl: text('action_url'),
        actionLabel: text('action_label'),

        // Polymorphic reference to what triggered this notification
        entityType: text('entity_type'), // e.g. "invitation", "payment", "mention"
        entityId: text('entity_id'), // UUID of the related entity

        // Delivery tracking
        readAt: timestamp('read_at', { withTimezone: true }),
        dismissedAt: timestamp('dismissed_at', { withTimezone: true }),

        // For email/push notifications: delivery status
        emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
        pushSentAt: timestamp('push_sent_at', { withTimezone: true }),

        // Metadata JSON for template variables
        metadata: text('metadata'),

        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        userIdx: index('notifications_user_idx').on(t.userId),
        unreadIdx: index('notifications_unread_idx').on(t.userId, t.readAt),
        entityIdx: index('notifications_entity_idx').on(
            t.entityType,
            t.entityId,
        ),
    }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = Notification['type'];
