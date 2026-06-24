import { configuration, configValidationSchema } from '@app/config';
import { AppLoggerModule } from '@app/logger';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

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
    ])
  ],
  controllers: [],
  providers: [], })
export class ApiModule {}
