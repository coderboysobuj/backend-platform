import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './cache.constants';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db', 0),
          keyPrefix: configService.get<string>('redis.keyPrefix', 'platform:'),
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
          retryStrategy: (times) => Math.min(times * 50, 2000),
        });
      },
    },
    CacheService,
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheModule {}
