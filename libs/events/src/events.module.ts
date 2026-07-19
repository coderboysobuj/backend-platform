import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEventEmitter } from './domain-events';

@Module({
    imports: [
        EventEmitterModule.forRoot({
            wildcard: false,
            delimiter: '.',
            maxListeners: 20,
            verboseMemoryLeak: true,
            ignoreErrors: false,
        }),
    ],
    providers: [DomainEventEmitter],
    exports: [DomainEventEmitter, EventEmitterModule],
})
export class DomainEventsModule {}
