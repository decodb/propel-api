import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { MailOptions, MailTemplate } from './mail.types';
import { getEnv } from 'src/common/config/env';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: getEnv('MAIL_HOST'),
    port: parseInt(getEnv('MAIL_PORT'), 10),
    auth: {
      user: getEnv('MAIL_USER'),
      pass: getEnv('MAIL_PASS'),
    },
  });

  private readonly subjectMap: Record<MailTemplate, string> = {
    [MailTemplate.EMAIL_VERIFICATION]: 'Verify your email address',
    [MailTemplate.FORGOT_PASSWORD]: 'Reset your password',
    [MailTemplate.NEW_SIGN_UP]: 'New Sign Up',
  };

  async sendMail({ to, template, context }: MailOptions): Promise<void> {
    const html = this.renderTemplate(template, context);

    await this.transporter.sendMail({
      from: `"MyApp" <${process.env.EMAIL_USER}>`,
      to,
      subject: this.subjectMap[template],
      html,
    });
  }

  private renderTemplate(
    template: MailTemplate,
    context: Record<string, string>,
  ): string {
    const filePath = path.join(__dirname, 'templates', `${template}.html`);
    let html = fs.readFileSync(filePath, 'utf-8');

    // Replace {{key}} placeholders with context values
    for (const [key, value] of Object.entries(context)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }

    return html;
  }
}
