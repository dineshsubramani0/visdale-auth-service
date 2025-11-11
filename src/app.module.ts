import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EncryptionService } from './services/encryption.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENV_CONFIG_KEYS } from './utils/constant/env.constant';
import { BaseMiddleware } from './middleware/base.middleware';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule as NestConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    AuthModule,
    LoggerModule,
    NestConfigModule,
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [NestConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(ENV_CONFIG_KEYS.JWT_SECRET_KEY),
        signOptions: {
          expiresIn: +configService.get<string>(
            ENV_CONFIG_KEYS.JWT_EXPIRES_IN_MILLISECOND,
          ),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [
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
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseMiddleware).forRoutes('*');
  }
}
