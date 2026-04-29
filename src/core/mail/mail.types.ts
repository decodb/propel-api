export enum MailTemplate {
  EMAIL_VERIFICATION = 'email-verification',
  FORGOT_PASSWORD = 'forgot-password',
  NEW_SIGN_UP = 'new-sign-up',
}

export interface MailOptions {
  to: string;
  template: MailTemplate;
  context: Record<string, string>; // injected into HTML placeholders
}
