import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  cc?: string;
  bcc?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly fromName: string;
  private readonly templatesDir: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('mailer.from', 'noreply@platform.com');
    this.fromName = config.get<string>('mailer.fromName', 'Platform');
    this.templatesDir = join(__dirname, 'templates');
    this.setupTransporter();
  }

  private setupTransporter() {
    const driver = this.config.get<string>('mailer.driver', 'smtp');

    if (driver === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('mailer.smtp.host'),
        port: this.config.get<number>('mailer.smtp.port', 587),
        secure: this.config.get<boolean>('mailer.smtp.secure', false),
        auth: {
          user: this.config.get<string>('mailer.smtp.user'),
          pass: this.config.get<string>('mailer.smtp.pass'),
        },
      });
    } else if (driver === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: this.config.get<string>('mailer.sendgrid.apiKey'),
        },
      });
    }
  }

  async send(options: SendMailOptions): Promise<void> {
    const html = this.renderTemplate(options.template, options.context);
    const text = this.renderTemplate(`${options.template}-text`, options.context, true);

    const isProduction = this.config.get<string>('app.env') === 'production';

    if (!isProduction && this.config.get<string>('app.env') !== 'test') {
      this.logger.debug(`[DEV] Email: to=${options.to} subject="${options.subject}" template=${options.template}`);
      // In development, log instead of sending (unless Mailhog is configured)
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.from}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html,
        text: text || undefined,
        attachments: options.attachments,
      });
      this.logger.debug(`Email sent: ${options.subject} → ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, unknown>,
    isText = false,
  ): string {
    const ext = isText ? '.txt' : '.html';
    const templatePath = join(this.templatesDir, `${templateName}${ext}`);

    if (!existsSync(templatePath)) {
      if (isText) return ''; // text version is optional
      this.logger.warn(`Email template not found: ${templatePath}`);
      return this.getFallbackTemplate(templateName, context);
    }

    const source = readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(source);
    return compiled(context);
  }

  private getFallbackTemplate(templateName: string, context: Record<string, unknown>): string {
    return `
      <html><body>
        <h2>${context['title'] ?? templateName}</h2>
        <p>${context['body'] ?? JSON.stringify(context)}</p>
        ${context['actionUrl'] ? `<a href="${context['actionUrl']}">${context['actionLabel'] ?? 'Click here'}</a>` : ''}
      </body></html>
    `;
  }
}
