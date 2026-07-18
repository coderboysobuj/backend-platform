import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

async function runMigrations() {
  const url = process.env.DATABASE_URL ??
    `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

  console.log('🔌 Connecting to database...');
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log('📦 Running migrations...');
  await migrate(db, {
    migrationsFolder: join(__dirname, './'),
  });

  console.log('✅ Migrations complete');
  await client.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
