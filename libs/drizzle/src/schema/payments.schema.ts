import { sql } from 'drizzle-orm';
import {
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
    boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { organizations } from './organizations.schema';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'paused',
    'incomplete',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
    'pending',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded',
]);

/**
 * subscriptions — mirrors Stripe subscription state locally.
 *
 * We never trust local state over Stripe — all mutations happen
 * via Stripe webhooks. This table is a read cache for fast permission checks.
 * Owner can be a user (individual) or an organization (team plan).
 */
export const subscriptions = pgTable(
    'subscriptions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        // Owner: either user OR organization (not both)
        userId: uuid('user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        organizationId: uuid('organization_id').references(
            () => organizations.id,
            { onDelete: 'set null' },
        ),

        // Stripe IDs
        stripeSubscriptionId: text('stripe_subscription_id').notNull(),
        stripeCustomerId: text('stripe_customer_id').notNull(),
        stripePriceId: text('stripe_price_id').notNull(),
        stripeProductId: text('stripe_product_id').notNull(),

        status: subscriptionStatusEnum('status').notNull(),
        planName: text('plan_name').notNull(),
        planInterval: text('plan_interval').notNull(), // 'month' | 'year'

        // Entitlements (JSON) — what features this subscription unlocks
        features: text('features').notNull().default('{}'),

        // Trial
        trialStart: timestamp('trial_start', { withTimezone: true }),
        trialEnd: timestamp('trial_end', { withTimezone: true }),

        // Billing period
        currentPeriodStart: timestamp('current_period_start', {
            withTimezone: true,
        }).notNull(),
        currentPeriodEnd: timestamp('current_period_end', {
            withTimezone: true,
        }).notNull(),
        cancelAtPeriodEnd: boolean('cancel_at_period_end')
            .notNull()
            .default(false),
        canceledAt: timestamp('canceled_at', { withTimezone: true }),

        // Raw Stripe event payload for audit
        metadata: text('metadata'),

        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        stripeSubIdx: index('subscriptions_stripe_sub_idx').on(
            t.stripeSubscriptionId,
        ),
        userIdx: index('subscriptions_user_idx').on(t.userId),
        orgIdx: index('subscriptions_org_idx').on(t.organizationId),
    }),
);

/**
 * payment_history — immutable log of all payment events.
 */
export const paymentHistory = pgTable(
    'payment_history',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        subscriptionId: uuid('subscription_id').references(
            () => subscriptions.id,
        ),
        userId: uuid('user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        organizationId: uuid('organization_id').references(
            () => organizations.id,
            { onDelete: 'set null' },
        ),

        stripePaymentIntentId: text('stripe_payment_intent_id'),
        stripeInvoiceId: text('stripe_invoice_id'),
        stripeChargeId: text('stripe_charge_id'),

        status: paymentStatusEnum('status').notNull(),
        amount: integer('amount').notNull(), // in cents
        currency: text('currency').notNull().default('usd'),
        description: text('description'),

        // Refund tracking
        refundedAmount: integer('refunded_amount').notNull().default(0),
        refundReason: text('refund_reason'),

        paidAt: timestamp('paid_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
    },
    (t) => ({
        userIdx: index('payments_user_idx').on(t.userId),
        orgIdx: index('payments_org_idx').on(t.organizationId),
        stripePaymentIdx: index('payments_stripe_intent_idx').on(
            t.stripePaymentIntentId,
        ),
    }),
);

/**
 * stripe_webhook_events — idempotency log for Stripe webhooks.
 * Prevents processing the same event twice (Stripe can deliver events multiple times).
 */
export const stripeWebhookEvents = pgTable(
    'stripe_webhook_events',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        stripeEventId: text('stripe_event_id').notNull(),
        eventType: text('event_type').notNull(),
        processed: boolean('processed').notNull().default(false),
        processingError: text('processing_error'),
        payload: text('payload').notNull(), // raw Stripe event JSON
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .default(sql`now()`),
        processedAt: timestamp('processed_at', { withTimezone: true }),
    },
    (t) => ({
        stripeEventIdx: index('stripe_events_event_id_idx').on(t.stripeEventId),
    }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
