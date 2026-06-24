import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { SchedulerAppModule } from './scheduler.module';

async function bootstrap() {
  const app = await NestFactory.create(SchedulerAppModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.init();
  Logger.log('Scheduler service started', 'SchedulerBootstrap');
}

void bootstrap();
