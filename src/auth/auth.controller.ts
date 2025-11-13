// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/dto/user/register.dto';
import { VerifyOtpDto } from 'src/dto/user/verify-otp.dto';
import { RequestOtpDto } from 'src/dto/user/request-otp.dto';
import { AUTH_ROUTES } from 'src/utils/constant/routes/auth.route';
import { LocalAuthGuard } from 'src/guard/local-auth.guard';
import { User } from 'src/models/user.entity';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RefreshTokenGuard } from 'src/guard/refresh-token.guard';

interface RequestWithUser extends ExpressRequest {
  user: User;
  cookies: Record<string, string>;
}

@Controller(AUTH_ROUTES.BASEURL)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(AUTH_ROUTES.REQUEST_OTP)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post(AUTH_ROUTES.VERIFY_OTP)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post(AUTH_ROUTES.REGISTER)
  async register(@Body() dto: RegisterDto) {
    return this.authService.createAccount(dto);
  }

  @Post(AUTH_ROUTES.LOGIN)
  @UseGuards(LocalAuthGuard)
  async login(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const { access_token, refresh_token } = await this.authService.login(
      req.user,
    );

    // Set httpOnly cookie for refresh token
    res.cookie('_rt', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: Number(process.env.JWT_REFRESH_EXPIRES_IN_MILLISECOND),
      sameSite: 'strict',
    });

    return { access_token };
  }

  @Post(AUTH_ROUTES.REFRESH)
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['_rt'];
    if (!refreshToken)
      throw new UnauthorizedException('No refresh token found');

    const { access_token, refresh_token } = await this.authService.refreshToken(
      req.user.id,
      refreshToken,
    );

    // Update cookie
    res.cookie('_rt', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: Number(process.env.JWT_REFRESH_EXPIRES_IN_MILLISECOND),
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return { access_token };
  }

  @Post(AUTH_ROUTES.LOGOUT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['_rt'];
    if (refreshToken) {
      await this.authService.logout(req.user.id);
    }

    res.clearCookie('_rt', { httpOnly: true, sameSite: 'strict' });
    return { message: 'Logged out successfully' };
  }

  @Get(AUTH_ROUTES.ME)
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: RequestWithUser) {
    const user = await this.authService.getProfile(req.user.id);
    return user;
  }

  @Get(AUTH_ROUTES.VALID_USER)
  @UseGuards(JwtAuthGuard)
  validUser(@Request() req: RequestWithUser) {
    return this.authService.validUser(req.user);
  }
}
