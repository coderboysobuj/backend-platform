import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobDispatcher } from '@app/jobs';


/**
 * AppScheduler — manages all platform cron jobs.
 *
 * Jobs defined here are background schedules that trigger
 * business processes via the job queue (not inline execution).
 *
 * Enqueue jobs rather than executing logic directly —
 * this keeps the scheduler resilient and retryable.
 */
@Injectable()
export class AppScheduler {
  private readonly logger = new Logger(AppScheduler.name);

  constructor(private readonly jobDispatcher: JobDispatcher) {}

  /**
   * Daily cleanup of expired sessions and tokens.
   * Runs every day at 2:00 AM UTC.
   */
  @Cron('0 2 * * *', { name: 'daily-cleanup', timeZone: 'UTC' })
  async scheduleDailyCleanup() {
    this.logger.log('Scheduled: daily cleanup triggered');
    await this.jobDispatcher.generateReport('daily-cleanup', {
      date: new Date().toISOString(),
    });
  }

  /**
   * Weekly usage report generation.
   * Runs every Monday at 6:00 AM UTC.
   */
  @Cron('0 6 * * 1', { name: 'weekly-report', timeZone: 'UTC' })
  async scheduleWeeklyReport() {
    this.logger.log('Scheduled: weekly report triggered');
    await this.jobDispatcher.generateReport('weekly-summary', {
      weekStart: this.getWeekStart().toISOString(),
    });
  }

  /**
   * Health metrics export — every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'metrics-export' })
  async exportMetrics() {
    this.logger.debug('Scheduled: metrics export');
    // Metrics are scraped by Prometheus — this is for custom aggregations
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }
}
