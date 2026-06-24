import { configuration, configValidationSchema } from '@app/config';
import { AppLoggerModule } from '@app/logger';
import { ObservabilityModule } from '@app/observability';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { CacheModule } from '@app/cache';
import { JobsModule } from '@app/jobs';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // logging
    AppLoggerModule,
    CacheModule,

    // jobs / queues
    JobsModule,

    ThrottlerModule.forRoot([
      {
        ttl: configuration().throttle.ttl,
        limit: configuration().throttle.limit,
      }
    ]),

    // scheduler
    ScheduleModule.forRoot(),

    // observability
    ObservabilityModule,

    // feature modules
    HealthModule
  ],
  controllers: [],
  providers: [], })
export class ApiModule {}
