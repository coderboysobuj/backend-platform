import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Base Event
export abstract class BaseDomainEvent {
    readonly eventId = uuidv4();
    readonly occurredAt = new Date();
    abstract readonly eventName: string;
}

// Auth events
export class UserRegisteredEvent extends BaseDomainEvent {
    readonly eventName = 'user.registered';
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly fullName: string,
    ) {
        super();
    }
}

export class UserLoggedInEvent extends BaseDomainEvent {
    readonly eventName = 'user.logged_in';
    constructor(
        public readonly userId: string,
        public readonly ip: string,
        public readonly userAgent: string,
    ) {
        super();
    }
}

export class UserEmailVerifiedEvent extends BaseDomainEvent {
    readonly eventName = 'user.email_verified';
    constructor(public readonly userId: string) {
        super();
    }
}

export class UserPasswordChangedEvent extends BaseDomainEvent {
    readonly eventName = 'user.password_changed';
    constructor(public readonly userId: string) {
        super();
    }
}

export class UserDeactivatedEvent extends BaseDomainEvent {
    readonly eventName = 'user.deactivated';
    constructor(
        public readonly userId: string,
        public readonly reason?: string,
    ) {
        super();
    }
}

// organization events

export class OrgCreatedEvent extends BaseDomainEvent {
    readonly eventName = 'organization.created';
    constructor(
        public readonly orgId: string,
        public readonly ownerId: string,
        public readonly name: string,
    ) {
        super();
    }
}

export class OrgMemberJoinedEvent extends BaseDomainEvent {
    readonly eventName = 'organization.member_joined';
    constructor(
        public readonly orgId: string,
        public readonly userId: string,
        public readonly role: string,
    ) {
        super();
    }
}

export class OrgMemberRemovedEvent extends BaseDomainEvent {
    readonly eventName = 'organization.member_removed';
    constructor(
        public readonly orgId: string,
        public readonly userId: string,
    ) {
        super();
    }
}

// payment events

export class SubscriptionActivatedEvent extends BaseDomainEvent {
    readonly eventName = 'payment.subscription_activated';
    constructor(
        public readonly userId: string | null,
        public readonly orgId: string | null,
        public readonly planName: string,
    ) {
        super();
    }
}

export class SubscriptionCanceledEvent extends BaseDomainEvent {
    readonly eventName = 'payment.subscription_canceled';
    constructor(
        public readonly userId: string | null,
        public readonly orgId: string | null,
    ) {
        super();
    }
}

// notification events

export class NotificationCreatedEvent extends BaseDomainEvent {
    readonly eventName = 'notification.created';
    constructor(
        public readonly notificationId: string,
        public readonly userId: string,
        public readonly title: string,
        public readonly body: string,
        public readonly actionUrl?: string,
    ) {
        super();
    }
}

// emitter service

@Injectable()
export class DomainEventEmitter {
    constructor(private readonly emitter: EventEmitter2) {}

    async emit(event: BaseDomainEvent): Promise<void> {
        await this.emitter.emitAsync(event.eventName, event);
    }

    async emitMany(events: BaseDomainEvent[]): Promise<void> {
        await Promise.all(events.map((e) => this.emit(e)));
    }
}
