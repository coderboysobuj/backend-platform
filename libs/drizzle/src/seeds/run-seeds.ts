import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, isNull, and } from 'drizzle-orm';

dotenv.config();

import * as schema from '../schema';
import { SYSTEM_PERMISSIONS, SYSTEM_ROLES } from '@app/shared-types';

const url = process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

async function seed() {
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('🌱 Seeding permissions...');
  for (const perm of SYSTEM_PERMISSIONS) {
    await db.insert(schema.permissions).values({
      name: perm.name,
      displayName: perm.displayName,
      resource: perm.resource,
      action: perm.action,
      isSystem: perm.isSystem,
    }).onConflictDoNothing();
  }
  console.log(`   ✔ ${SYSTEM_PERMISSIONS.length} permissions seeded`);

  console.log('🌱 Seeding roles...');
  for (const roleDef of SYSTEM_ROLES) {
    await db.insert(schema.roles).values({
      name: roleDef.name,
      displayName: roleDef.displayName,
      description: roleDef.description,
      isSystem: roleDef.isSystem,
      isDefault: roleDef.isDefault,
    }).onConflictDoNothing();
  }
  console.log(`   ✔ ${SYSTEM_ROLES.length} roles seeded`);

  // Assign all permissions to super_admin role
  console.log('🌱 Assigning permissions to super_admin...');
  const [superAdminRole] = await db.select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.name, 'super_admin'), isNull(schema.roles.organizationId)))
    .limit(1);

  const allPerms = await db.select({ id: schema.permissions.id }).from(schema.permissions);
  for (const perm of allPerms) {
    await db.insert(schema.rolePermissions).values({
      roleId: superAdminRole.id,
      permissionId: perm.id,
    }).onConflictDoNothing();
  }
  console.log(`   ✔ ${allPerms.length} permissions assigned to super_admin`);

  // Seed super admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@platform.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!@#ChangeMe';

  const [existing] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (!existing) {
    console.log(`🌱 Seeding super admin user: ${adminEmail}`);
    const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

    const [adminUser] = await db.insert(schema.users).values({
      firstName: 'Platform',
      lastName: 'Admin',
      email: adminEmail,
      passwordHash,
      systemRole: 'super_admin',
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    }).returning({ id: schema.users.id });

    // Assign super_admin role to user
    await db.insert(schema.userRoles).values({
      userId: adminUser.id,
      roleId: superAdminRole.id,
    }).onConflictDoNothing();

    console.log(`   ✔ Super admin created: ${adminEmail}`);
    console.log(`   ⚠  Default password: ${adminPassword} — CHANGE THIS IN PRODUCTION`);
  } else {
    console.log(`   ✔ Super admin already exists: ${adminEmail}`);
  }

  await client.end();
  console.log('\n✅ Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
