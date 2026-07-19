export const QUEUE_NAMES = {
    EMAIL: 'email',
    NOTIFICATION: 'notification',
    REPORT: 'report',
    FILE_PROCESSING: 'file-processing',
    AI_TASK: 'ai-task',
    AUDIT: 'audit',
    WEBHOOK: 'webhook',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
    // Email jobs
    SEND_WELCOME_EMAIL: 'send-welcome-email',
    SEND_PASSWORD_RESET: 'send-password-reset',
    SEND_VERIFICATION_EMAIL: 'send-verification-email',
    SEND_GENERIC_EMAIL: 'send-generic-email',

    // Notification jobs
    PUSH_NOTIFICATION: 'push-notification',
    IN_APP_NOTIFICATION: 'in-app-notification',

    // Report jobs
    GENERATE_REPORT: 'generate-report',
    EXPORT_CSV: 'export-csv',

    // File jobs
    PROCESS_UPLOAD: 'process-upload',
    GENERATE_THUMBNAIL: 'generate-thumbnail',

    // AI task jobs
    AI_INFERENCE: 'ai-inference',
    AI_BATCH_PROCESS: 'ai-batch-process',

    // Audit
    AUDIT_LOG_ENTRY: 'audit-log-entry',

    // Webhook
    DISPATCH_WEBHOOK: 'dispatch-webhook',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
