// system permissions — seeded on first run
export const SYSTEM_PERMISSIONS = [
  // users
  { name: 'users:read',    displayName: 'read users',    resource: 'users',    action: 'read',    isSystem: true },
  { name: 'users:write',   displayName: 'write users',   resource: 'users',    action: 'write',   isSystem: true },
  { name: 'users:delete',  displayName: 'delete users',  resource: 'users',    action: 'delete',  isSystem: true },
  // rbac
  { name: 'rbac:read',     displayName: 'read roles',    resource: 'rbac',     action: 'read',    isSystem: true },
  { name: 'rbac:write',    displayName: 'write roles',   resource: 'rbac',     action: 'write',   isSystem: true },
  { name: 'rbac:delete',   displayName: 'delete roles',  resource: 'rbac',     action: 'delete',  isSystem: true },
  // organizations
  { name: 'orgs:read',     displayName: 'read orgs',     resource: 'orgs',     action: 'read',    isSystem: true },
  { name: 'orgs:write',    displayName: 'write orgs',    resource: 'orgs',     action: 'write',   isSystem: true },
  { name: 'orgs:delete',   displayName: 'delete orgs',   resource: 'orgs',     action: 'delete',  isSystem: true },
  // billing
  { name: 'billing:read',  displayName: 'read billing',  resource: 'billing',  action: 'read',    isSystem: true },
  { name: 'billing:write', displayName: 'write billing', resource: 'billing',  action: 'write',   isSystem: true },
  // audit
  { name: 'audit:read',    displayName: 'read audit logs', resource: 'audit',  action: 'read',    isSystem: true },
  // reports
  { name: 'reports:read',  displayName: 'read reports',  resource: 'reports',  action: 'read',    isSystem: true },
  { name: 'reports:export',displayName: 'export reports',resource: 'reports',  action: 'export',  isSystem: true },
  // wildcard
  { name: '*',             displayName: 'super admin',   resource: '*',        action: '*',       isSystem: true },
] as const;

// system roles — seeded on first run, cannot be deleted
export const SYSTEM_ROLES = [
  {
    name: 'super_admin',
    displayName: 'super admin',
    description: 'full platform access',
    isSystem: true,
    isDefault: false,
  },
  {
    name: 'admin',
    displayName: 'admin',
    description: 'administrative access',
    isSystem: true,
    isDefault: false,
  },
  {
    name: 'member',
    displayName: 'member',
    description: 'default member role',
    isSystem: true,
    isDefault: true, // auto-assigned on registration
  },
] as const;
