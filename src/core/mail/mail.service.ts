import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { MailOptions, MailTemplate } from './mail.types';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  private readonly subjectMap: Record<MailTemplate, string> = {
    [MailTemplate.EMAIL_VERIFICATION]: 'Verify your email address',
    [MailTemplate.FORGOT_PASSWORD]: 'Reset your password',
    [MailTemplate.NEW_SIGN_UP]: 'New Sign Up',
  };

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: parseInt(this.config.getOrThrow<string>('MAIL_PORT'), 10),
      secure: true,
      auth: {
        user: this.config.getOrThrow<string>('EMAIL_USER'),
        pass: this.config.getOrThrow<string>('EMAIL_PASS'),
      },
    });
  }

  async sendMail({ to, template, context }: MailOptions): Promise<void> {
    const html = this.renderTemplate(template, context);

    await this.transporter.sendMail({
      from: `"Propel - Mkhwanazi Software " <${this.config.getOrThrow('EMAIL_USER')}>`,
      to,
      subject: this.subjectMap[template],
      html,
    });
  }

  private renderTemplate(
    template: MailTemplate,
    context: Record<string, string>,
  ): string {
    const filePath = path.join(
      process.cwd(),
      'src',
      'core',
      'mail',
      'templates',
      `${template}.html`,
    );

    let html = fs.readFileSync(filePath, 'utf-8');

    for (const [key, value] of Object.entries(context)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }

    return html;
  }
}
