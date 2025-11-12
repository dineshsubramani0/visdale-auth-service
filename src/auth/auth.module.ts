import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailModule } from 'src/mail/mail.module';
import { User } from 'src/models/user.entity';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { JwtService } from '@nestjs/jwt';
import { LocalStrategy } from 'src/strategies/local.strategy';
import { RefreshTokenStrategy } from 'src/strategies/refresh-token.strategy';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { EncryptionService } from 'src/services/encryption.service';
import { ConfigService } from '@nestjs/config';
import { ENV_CONFIG_KEYS } from 'src/utils/constant/env.constant';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule],
  providers: [
    LocalStrategy,
    AuthService,
    UsersRepository,
    JwtService,
    RefreshTokenStrategy,
    JwtStrategy,
    {
      provide: EncryptionService,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>(
          String(ENV_CONFIG_KEYS.ENCRYPTION_SECRET_KEY),
        );
        return new EncryptionService(secretKey);
      },
      inject: [ConfigService],
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
