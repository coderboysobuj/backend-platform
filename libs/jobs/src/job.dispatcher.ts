import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, JobsOptions } from 'bullmq';

import { JOB_NAMES, QUEUE_NAMES } from './job.constants';

export interface SendEmailJobPayload {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
}

export interface AiTaskJobPayload {
    taskType: string;
    input: Record<string, unknown>;
    callbackJobId?: string;
}

export interface AuditLogJobPayload {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
}

/**
 * JobDispatcher — central service for enqueuing jobs.
 *
 * Application code should use this service rather than injecting
 * queues directly. This keeps job dispatch decoupled from queue names.
 */
@Injectable()
export class JobDispatcher {
    private readonly logger = new Logger(JobDispatcher.name);

    constructor(
        @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
        @InjectQueue(QUEUE_NAMES.NOTIFICATION)
        private readonly notificationQueue: Queue,
        @InjectQueue(QUEUE_NAMES.REPORT) private readonly reportQueue: Queue,
        @InjectQueue(QUEUE_NAMES.FILE_PROCESSING)
        private readonly fileQueue: Queue,
        @InjectQueue(QUEUE_NAMES.AI_TASK) private readonly aiTaskQueue: Queue,
        @InjectQueue(QUEUE_NAMES.AUDIT) private readonly auditQueue: Queue,
        @InjectQueue(QUEUE_NAMES.WEBHOOK) private readonly webhookQueue: Queue,
    ) {}

    async sendEmail(payload: SendEmailJobPayload, options?: JobsOptions) {
        this.logger.debug(`Dispatching email job to ${payload.to}`);
        return this.emailQueue.add(
            JOB_NAMES.SEND_GENERIC_EMAIL,
            payload,
            options,
        );
    }

    async sendWelcomeEmail(
        payload: Pick<SendEmailJobPayload, 'to' | 'context'>,
    ) {
        return this.emailQueue.add(JOB_NAMES.SEND_WELCOME_EMAIL, {
            ...payload,
            subject: 'Welcome!',
            template: 'welcome',
        });
    }

    async sendPasswordReset(
        payload: Pick<SendEmailJobPayload, 'to' | 'context'>,
    ) {
        return this.emailQueue.add(
            JOB_NAMES.SEND_PASSWORD_RESET,
            {
                ...payload,
                subject: 'Password Reset',
                template: 'password-reset',
            },
            { priority: 1 }, // high priority
        );
    }

    async dispatchAiTask(payload: AiTaskJobPayload, options?: JobsOptions) {
        this.logger.debug(`Dispatching AI task: ${payload.taskType}`);
        return this.aiTaskQueue.add(JOB_NAMES.AI_INFERENCE, payload, {
            ...options,
        });
    }

    async logAuditEvent(payload: AuditLogJobPayload) {
        // Fire and forget — audit log never blocks request flow
        return this.auditQueue.add(JOB_NAMES.AUDIT_LOG_ENTRY, payload, {
            attempts: 5,
            removeOnComplete: { count: 200 },
        });
    }

    async generateReport(
        type: string,
        params: Record<string, unknown>,
        options?: JobsOptions,
    ) {
        return this.reportQueue.add(
            JOB_NAMES.GENERATE_REPORT,
            { type, params },
            options,
        );
    }

    async processFileUpload(fileId: string, options?: JobsOptions) {
        return this.fileQueue.add(
            JOB_NAMES.PROCESS_UPLOAD,
            { fileId },
            options,
        );
    }

    async dispatchWebhook(
        url: string,
        event: string,
        payload: Record<string, unknown>,
        options?: JobsOptions,
    ) {
        return this.webhookQueue.add(
            JOB_NAMES.DISPATCH_WEBHOOK,
            { url, event, payload },
            {
                attempts: 5,
                backoff: { type: 'exponential', delay: 10000 },
                ...options,
            },
        );
    }

    /**
     * Schedule a delayed job (e.g. send reminder in 24 hours).
     */
    async scheduleEmail(payload: SendEmailJobPayload, delayMs: number) {
        return this.emailQueue.add(JOB_NAMES.SEND_GENERIC_EMAIL, payload, {
            delay: delayMs,
        });
    }
}
