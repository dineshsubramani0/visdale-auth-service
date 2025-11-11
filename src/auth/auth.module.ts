import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailModule } from 'src/mail/mail.module';
import { User } from 'src/models/user.entity';
import { UsersRepository } from 'src/models-repository/user.model.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule],
  providers: [AuthService, UsersRepository],
  controllers: [AuthController],
})
export class AuthModule {}
