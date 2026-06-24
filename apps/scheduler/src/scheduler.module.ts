import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { configuration, configValidationSchema } from '@app/config';
import { JobsModule } from '@app/jobs';
import { AppLoggerModule } from '@app/logger';

import { AppScheduler } from './app.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
    }),
    AppLoggerModule,
    ScheduleModule.forRoot(),
    JobsModule,
  ],
  providers: [AppScheduler],
})
export class SchedulerAppModule {}
