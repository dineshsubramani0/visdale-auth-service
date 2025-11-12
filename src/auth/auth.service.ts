import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/models/user.entity';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { MailService } from 'src/mail/mail.service';
import { RegisterDto } from 'src/dto/user/register.dto';
import { RequestOtpDto } from 'src/dto/user/request-otp.dto';
import { VerifyOtpDto } from 'src/dto/user/verify-otp.dto';
import { AUTH_MESSAGES } from 'src/utils/constant/auth.constant';
import { UserStatus } from 'src/@types/enums/status.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  /** Step 1: Request OTP */
  async requestOtp(dto: RequestOtpDto) {
    try {
      const existingUser = await this.usersRepository.findOneByFilter({
        email: dto.email,
      });
      if (existingUser && existingUser.status === UserStatus.CREATED) {
        throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ALREADY_CREATED);
      }

      const otpLength = Number(process.env.OTP_LENGTH) || 6;
      const otpExpiryMinutes = Number(process.env.OTP_EXPIRES_IN_MINUTES) || 10;

      const otp = Math.floor(Math.random() * Math.pow(10, otpLength))
        .toString()
        .padStart(otpLength, '0');

      const otpExpiryDate = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);

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
        user = existingUser;
        user.first_name = dto.first_name;
        user.last_name = dto.last_name;
        user.otp = otp;
        user.otp_expiry = otpExpiryDate;
        user.status = UserStatus.PENDING;
      } else {
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
      throw new InternalServerErrorException(AUTH_MESSAGES.OTP_SEND_FAILED);
    }
  }

  /** Step 2: Verify OTP */
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersRepository.findOneByFilter({
      email: dto.email,
    });

    if (!user) throw new BadRequestException(AUTH_MESSAGES.USER_NOT_FOUND);
    if (user.status === UserStatus.CREATED)
      throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ALREADY_CREATED);
    if (user.status !== UserStatus.PENDING)
      throw new BadRequestException(AUTH_MESSAGES.OTP_NOT_REQUESTED);

    if (!user.otp || !user.otp_expiry)
      throw new BadRequestException(AUTH_MESSAGES.OTP_NOT_GENERATED);
    if (user.otp_expiry < new Date())
      throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
    if (user.otp !== dto.otp)
      throw new BadRequestException(AUTH_MESSAGES.INVALID_OTP);

    await this.usersRepository.update(user.id, {
      status: UserStatus.VERIFIED,
      otp: null,
      otp_expiry: null,
    });

    return { email: user.email, message: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS };
  }

  /** Step 3: Create Account */
  async createAccount(registerDto: RegisterDto) {
    const user = await this.usersRepository.findOneByFilter({
      email: registerDto.email,
    });
    if (!user) throw new BadRequestException(AUTH_MESSAGES.USER_NOT_FOUND);
    if (user.status === UserStatus.CREATED)
      throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ALREADY_CREATED);
    if (user.status !== UserStatus.VERIFIED)
      throw new BadRequestException(AUTH_MESSAGES.EMAIL_NOT_VERIFIED);

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    await this.usersRepository.update(user.id, {
      first_name: registerDto.first_name,
      last_name: registerDto.last_name,
      password: hashedPassword,
      status: UserStatus.CREATED,
    });

    return {
      email: user.email,
      message: AUTH_MESSAGES.ACCOUNT_CREATED_SUCCESS,
    };
  }

  /** Validate user credentials for login */
  async validateUser(email: string, password: string) {
    const user = await this.usersRepository.findOneByFilter({ email });
    if (!user) return null;

    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;

    const { ...result } = user;
    return result;
  }

  /** Step 4: Login - generate access & refresh tokens */
  async login(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessTokenExpiryMs =
      Number(process.env.JWT_EXPIRES_IN_MILLISECOND) || 15 * 60 * 1000; // 15 min
    const refreshTokenExpiryMs =
      Number(process.env.JWT_REFRESH_EXPIRES_IN_MILLISECOND) ||
      7 * 24 * 60 * 60 * 1000; // 7 days

    // Access token
    const access_token = this.jwtService.sign<typeof payload>(payload, {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: Math.floor(accessTokenExpiryMs / 1000),
    });

    // Refresh token
    const refresh_token = this.jwtService.sign<typeof payload>(payload, {
      secret: process.env.JWT_REFRESH_SECRET_KEY,
      expiresIn: Math.floor(refreshTokenExpiryMs / 1000),
    });

    const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
    await this.usersRepository.update(user.id, {
      refresh_token: hashedRefreshToken,
    });

    return { access_token, refresh_token };
  }

  /** Refresh access token using refresh token */
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.usersRepository.findOneByFilter({ id: userId });
    if (!user || !user.refresh_token)
      throw new UnauthorizedException('Invalid refresh token');

    const tokenMatches = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!tokenMatches) throw new UnauthorizedException('Invalid refresh token');

    return this.login(user); // reuse login to generate new tokens
  }

  /** Logout - clear refresh token */
  async logout(userId: string) {
    await this.usersRepository.update(userId, { refresh_token: null });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOneByFilter({ id: userId });
    if (!user) throw new UnauthorizedException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, password, otp, otp_expiry, status, ...result } =
      user;
    return result;
  }

  validUser(currentUserDto: User) {
    try {
      if (!currentUserDto) {
        throw new InternalServerErrorException();
      }

      return currentUserDto;
    } catch (error) {
      console.log(error, 'error ->>>>>>> validUser');
      throw new InternalServerErrorException();
    }
  }
}
