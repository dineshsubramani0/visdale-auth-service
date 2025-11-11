export interface MailTemplate {
  to: string;
  subject: string;
  templatefilename: string;
  context: Record<string, any>;
}
