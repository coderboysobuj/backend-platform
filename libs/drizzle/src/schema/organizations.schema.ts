import { sql } from 'drizzle-orm';
import {
  boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const orgPlanEnum = pgEnum('org_plan', ['free', 'starter', 'pro', 'enterprise']);
export const orgMemberStatusEnum = pgEnum('org_member_status', ['active', 'invited', 'suspended']);

/**
 * Organizations — the top-level multi-tenant container.
 *
 * Every future product built on this platform is multi-tenant by default:
 *  - SaaS products: each customer company = one organization
 *  - Agency model: each client = one organization
 *  - Internal tool: single organization for the whole company
 *
 * All major resources (projects, data, billing) hang off an organization.
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),  // URL-safe unique identifier
  plan: orgPlanEnum('plan').notNull().default('free'),
  logoUrl: text('logo_url'),
  website: text('website'),
  // Stripe billing
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  // Feature flags / settings stored as JSON
  settings: text('settings').notNull().default('{}'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  slugIdx: uniqueIndex('organizations_slug_idx').on(t.slug),
  stripeIdx: index('organizations_stripe_idx').on(t.stripeCustomerId),
}));

/**
 * organization_members — who belongs to each organization.
 * The role column here is the org-level role (owner/admin/member/viewer).
 * Fine-grained RBAC permissions are handled via user_roles + roles tables.
 */
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner | admin | member | viewer
  status: orgMemberStatusEnum('status').notNull().default('invited'),
  invitedBy: uuid('invited_by'),
  inviteEmail: text('invite_email'),  // if user not yet registered
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  orgUserIdx: uniqueIndex('org_members_org_user_idx').on(t.organizationId, t.userId),
  userIdx: index('org_members_user_idx').on(t.userId),
}));

/**
 * teams — sub-groups within an organization.
 * e.g. "Engineering", "Marketing", "Sales"
 */
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  orgIdx: index('teams_org_idx').on(t.organizationId),
}));

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // lead | member
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  teamUserIdx: uniqueIndex('team_members_idx').on(t.teamId, t.userId),
}));

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
