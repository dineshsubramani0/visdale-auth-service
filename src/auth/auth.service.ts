import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from 'src/models/user.entity';
import { RegisterDto } from 'src/dto/user/register.dto';
import { VerifyOtpDto } from 'src/dto/user/verify-otp.dto';
import { RequestOtpDto } from 'src/dto/user/request-otp.dto';
import { MailService } from 'src/mail/mail.service';
import { UserStatus } from 'src/@types/enums/status.enum';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { AUTH_MESSAGES } from 'src/utils/constant/auth.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    try {
      const existingUser = await this.usersRepository.findOneByFilter({
        email: dto.email,
      });

      if (existingUser && existingUser.status === UserStatus.CREATED) {
        throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ALREADY_CREATED);
      }

      const otpLength = Number(process.env.OTP_LENGTH) || 6; // Default to 6 digits if not set
      const otpExpiryMinutes = Number(process.env.OTP_EXPIRES_IN_MINUTES) || 10; // Default to 10 minutes

      // Generate a random OTP
      const otp = Math.floor(Math.random() * Math.pow(10, otpLength))
        .toString()
        .padStart(otpLength, '0'); // Ensure OTP has correct length

      // Calculate OTP expiry date
      const otpExpiryDate = new Date(
        Date.now() + otpExpiryMinutes * 60 * 1000, // Add OTP expiry in milliseconds (10 min default)
      );

      await this.mailService.sendMail({
        to: dto.email,
        subject: `${process.env.APPLICATION} - OTP Verification`,
        templatefilename: 'send-otp',
        context: {
          first_name: dto.first_name,
          last_name: dto.last_name,
          otp,
          APPLICATION: process.env.APPLICATION,
        },
      });

      let user: User;

      if (existingUser) {
        // Update existing pending user
        user = existingUser;
        user.first_name = dto.first_name;
        user.last_name = dto.last_name;
        user.otp = otp;
        user.otp_expiry = otpExpiryDate;
        user.status = UserStatus.PENDING;
      } else {
        // Create new user with pending status
        user = await this.usersRepository.create({
          first_name: dto.first_name,
          last_name: dto.last_name,
          email: dto.email,
          password: '',
          otp,
          otp_expiry: otpExpiryDate,
          status: UserStatus.PENDING,
        });
      }

      await this.usersRepository.update(user.id, { ...user });

      return { email: dto.email, message: AUTH_MESSAGES.OTP_SENT_SUCCESS };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      console.error('Request OTP failed:', err);
      throw new InternalServerErrorException(AUTH_MESSAGES.OTP_SEND_FAILED);
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    try {
      const user = await this.usersRepository.findOneByFilter({
        email: dto.email,
      });

      if (!user) throw new BadRequestException(AUTH_MESSAGES.USER_NOT_FOUND);
      if (user.status === UserStatus.CREATED) {
        throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ALREADY_CREATED);
      }
      if (user.status !== UserStatus.PENDING) {
        throw new BadRequestException(AUTH_MESSAGES.OTP_NOT_REQUESTED);
      }

      const now = new Date();
      if (!user.otp || !user.otp_expiry)
        throw new BadRequestException(AUTH_MESSAGES.OTP_NOT_GENERATED);
      if (user.otp_expiry < now)
        throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
      if (user.otp !== dto.otp)
        throw new BadRequestException(AUTH_MESSAGES.INVALID_OTP);

      await this.usersRepository.update(user.id, {
        status: UserStatus.VERIFIED,
        otp: null,
        otp_expiry: null,
      });

      return {
        email: user.email,
        message: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      console.error('Verify OTP failed:', err);
      throw new InternalServerErrorException('Failed to verify OTP');
    }
  }

  async createAccount(dto: RegisterDto) {
    try {
      const user = await this.usersRepository.findOneByFilter({
        email: dto.email,
      });

      if (!user) throw new BadRequestException(AUTH_MESSAGES.USER_NOT_FOUND);
      if (user.status === UserStatus.CREATED) {
        throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ALREADY_CREATED);
      }
      if (user.status !== UserStatus.VERIFIED) {
        throw new BadRequestException(AUTH_MESSAGES.EMAIL_NOT_VERIFIED);
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      await this.usersRepository.update(user.id, {
        first_name: dto.first_name,
        last_name: dto.last_name,
        password: hashedPassword,
        status: UserStatus.CREATED,
      });

      return {
        email: user.email,
        message: AUTH_MESSAGES.ACCOUNT_CREATED_SUCCESS,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      console.error('Create account failed:', err);
      throw new InternalServerErrorException('Failed to create account');
    }
  }
}
