// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/dto/user/register.dto';
import { VerifyOtpDto } from 'src/dto/user/verify-otp.dto';
import { RequestOtpDto } from 'src/dto/user/request-otp.dto';
import { AUTH_ROUTES } from 'src/utils/constant/routes/auth.route';

@Controller(AUTH_ROUTES.BASEURL)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Step 1: Request OTP for email verification
  @Post(AUTH_ROUTES.REQUEST_OTP)
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    return this.authService.requestOtp(requestOtpDto);
  }

  // Step 2: Verify OTP
  @Post(AUTH_ROUTES.VERIFY_OTP)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // Step 3: Create account after OTP verification
  @Post(AUTH_ROUTES.REGISTER)
  async register(@Body() dto: RegisterDto) {
    return this.authService.createAccount(dto);
  }
}
