import { Module } from '@nestjs/common';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'node:path';
import { MailService } from './mail.service';
import { LoggerModule } from 'src/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENV_CONFIG_KEYS } from 'src/utils/constant/env.constant';
import { EncryptionService } from 'src/services/encryption.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MailerOptions => ({
        transport: {
          host: configService.get<string>(ENV_CONFIG_KEYS.MAIL_HOST),
          port: Number(configService.get<number>(ENV_CONFIG_KEYS.MAIL_PORT)),
          secure: true,
          auth: {
            user: configService.get<string>(ENV_CONFIG_KEYS.MAIL_USER),
            pass: configService.get<string>(ENV_CONFIG_KEYS.MAIL_PASSWORD),
          },
          logger: true,
          debug: true,
        },
        defaults: {
          from: configService.get<string>(ENV_CONFIG_KEYS.MAIL_SENDER),
        },
        template: {
          dir: join(process.cwd(), 'src', 'utils', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
    LoggerModule,
  ],
  providers: [
    MailService,
    {
      provide: EncryptionService,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>(
          ENV_CONFIG_KEYS.ENCRYPTION_SECRET_KEY,
        );
        return new EncryptionService(secretKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
