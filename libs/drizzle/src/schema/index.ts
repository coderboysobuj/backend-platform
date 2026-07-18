// Re-export all schemas
export * from './users.schema';
export * from './sessions.schema';
export * from './tokens.schema';
export * from './rbac.schema';
export * from './organizations.schema';
export * from './payments.schema';
export * from './notifications.schema';
export * from './audit-apikeys.schema';

// ─── Cross-table Relations ────────────────────────────────────────────────────
// Declared here (not in individual files) to avoid circular imports

import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { userSessions } from './sessions.schema';
import { userTokens } from './tokens.schema';
import { userRoles, roles, rolePermissions, permissions } from './rbac.schema';
import { organizations, organizationMembers, teams, teamMembers } from './organizations.schema';
import { subscriptions, paymentHistory } from './payments.schema';
import { notifications } from './notifications.schema';
import { auditLogs, apiKeys } from './audit-apikeys.schema';

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  tokens: many(userTokens),
  userRoles: many(userRoles),
  orgMemberships: many(organizationMembers),
  teamMemberships: many(teamMembers),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  apiKeys: many(apiKeys),
  subscriptions: many(subscriptions),
}));

export const sessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const tokensRelations = relations(userTokens, ({ one }) => ({
  user: one(users, { fields: [userTokens.userId], references: [users.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  organization: one(organizations, { fields: [userRoles.organizationId], references: [organizations.id] }),
}));

export const rolesRelations = relations(roles, ({ many, one }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
  organization: one(organizations, { fields: [roles.organizationId], references: [organizations.id] }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  teams: many(teams),
  subscriptions: many(subscriptions),
  roles: many(roles),
}));

export const orgMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, { fields: [teams.organizationId], references: [organizations.id] }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  organization: one(organizations, { fields: [subscriptions.organizationId], references: [organizations.id] }),
  payments: many(paymentHistory),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  organization: one(organizations, { fields: [notifications.organizationId], references: [organizations.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  organization: one(organizations, { fields: [auditLogs.organizationId], references: [organizations.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
  organization: one(organizations, { fields: [apiKeys.organizationId], references: [organizations.id] }),
}));
