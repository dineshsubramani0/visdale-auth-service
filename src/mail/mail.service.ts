import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { MailTemplate } from 'src/@types/interfaces/mail.interface';
import { CustomLogger } from 'src/logger/logger.service';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: CustomLogger,
  ) {}

  async sendMail({ to, subject, templatefilename, context }: MailTemplate) {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: templatefilename,
        context,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          {
            message: 'Error occurred while sending user confirmation email.',
            filepath: __filename,
            functionname: this.sendMail.name,
          },
          error.stack ?? '',
          MailService.name,
        );
      }
      throw error;
    }
  }
}
