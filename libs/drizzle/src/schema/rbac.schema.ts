import { relations, sql } from 'drizzle-orm';
import {
  boolean, index, pgTable, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { organizations } from './organizations.schema';

/**
 * RBAC Design:
 *
 * - Roles and permissions are FULLY DYNAMIC — admins create them at runtime
 * - Permissions are namespaced strings: "resource:action" e.g. "users:delete"
 * - Roles are scoped: GLOBAL (platform-wide) or ORG-SCOPED (per organization)
 * - A user can have multiple roles (global + org-specific)
 * - Permission checks are cached in Redis to avoid DB hits per request
 *
 * Tables:
 *   permissions  → master list of all permission strings
 *   roles        → named groups (can be global or org-scoped)
 *   role_permissions → M:N between roles and permissions
 *   user_roles   → assigns roles to users (optionally scoped to an org)
 */

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Format: "resource:action" e.g. "users:read", "reports:export"
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  // Logical grouping for UI display
  resource: text('resource').notNull(),  // e.g. "users", "reports", "billing"
  action: text('action').notNull(),       // e.g. "read", "write", "delete", "export"
  isSystem: boolean('is_system').notNull().default(false), // system perms can't be deleted
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  nameIdx: uniqueIndex('permissions_name_idx').on(t.name),
  resourceIdx: index('permissions_resource_idx').on(t.resource),
}));

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  // null = global role; uuid = scoped to an organization
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  isSystem: boolean('is_system').notNull().default(false), // system roles can't be deleted
  isDefault: boolean('is_default').notNull().default(false), // auto-assigned to new users/members
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  nameOrgIdx: uniqueIndex('roles_name_org_idx').on(t.name, t.organizationId),
}));

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  rolePermIdx: uniqueIndex('role_permissions_idx').on(t.roleId, t.permissionId),
}));

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  // null = global assignment; uuid = only active within this org context
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by'),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // optional time-limited roles
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  userRoleIdx: uniqueIndex('user_roles_idx').on(t.userId, t.roleId, t.organizationId),
  userIdx: index('user_roles_user_idx').on(t.userId),
}));

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
