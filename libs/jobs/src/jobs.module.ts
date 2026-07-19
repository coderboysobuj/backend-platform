import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { QUEUE_NAMES } from './job.constants';
import { JobDispatcher } from './job.dispatcher';

/**
 * JobsModule — registers all BullMQ queues globally.
 *
 * Each queue is registered with sensible defaults:
 *   - Exponential backoff retry
 *   - Dead-letter queue via maxStalledCount
 *   - Job retention for monitoring
 */
@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('redis.host'),
                    port: configService.get<number>('redis.port'),
                    password:
                        configService.get<string>('redis.password') ||
                        undefined,
                    db: configService.get<number>('redis.db', 0),
                },
                prefix: configService.get<string>('queue.prefix', 'platform'),
                defaultJobOptions: {
                    attempts: configService.get<number>(
                        'queue.defaultAttempts',
                        3,
                    ),
                    backoff: {
                        type: 'exponential',
                        delay: configService.get<number>(
                            'queue.defaultBackoffDelay',
                            5000,
                        ),
                    },
                    removeOnComplete: { count: 500, age: 3600 * 24 },
                    removeOnFail: { count: 1000, age: 3600 * 24 * 7 },
                },
            }),
        }),

        // Register all application queues
        BullModule.registerQueue(
            { name: QUEUE_NAMES.EMAIL },
            { name: QUEUE_NAMES.NOTIFICATION },
            { name: QUEUE_NAMES.REPORT },
            { name: QUEUE_NAMES.FILE_PROCESSING },
            { name: QUEUE_NAMES.AI_TASK },
            { name: QUEUE_NAMES.AUDIT },
            { name: QUEUE_NAMES.WEBHOOK },
        ),
    ],
    providers: [JobDispatcher],
    exports: [BullModule, JobDispatcher],
})
export class JobsModule {}
