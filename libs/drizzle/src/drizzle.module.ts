import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');
export type DrizzleDB = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DrizzleDB => {
        const connectionString = config.get<string>('database.url') ??
          `postgresql://${config.get('database.username')}:${config.get('database.password')}@${config.get('database.host')}:${config.get('database.port')}/${config.get('database.database')}`;

        const client = postgres(connectionString, {
          max: config.get<number>('database.poolMax', 10),
          idle_timeout: 30,
          connect_timeout: 10,
          ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        });

        return drizzle(client, { schema, logger: config.get('app.env') === 'development' });
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DrizzleModule {}
