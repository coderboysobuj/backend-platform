import { configuration, configValidationSchema } from '@app/config';
import { AppLoggerModule } from '@app/logger';
import { ObservabilityModule } from '@app/observability';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';

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
    ThrottlerModule.forRoot([
      {
        ttl: configuration().throttle.ttl,
        limit: configuration().throttle.limit,
      }
    ]),

    // observability
    ObservabilityModule,

    // feature modules
    HealthModule
  ],
  controllers: [],
  providers: [], })
export class ApiModule {}
