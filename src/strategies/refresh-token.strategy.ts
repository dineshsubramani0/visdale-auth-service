import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import * as bcrypt from 'bcrypt';
import { User } from 'src/models/user.entity';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly usersRepository: UsersRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?._rt as string, // <-- Refresh token
      ]),
      secretOrKey: process.env.JWT_REFRESH_SECRET_KEY,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User | null> {
    const refreshToken = req.cookies['_rt'] as string;
    if (!refreshToken) return null;

    const user = await this.usersRepository.findOneByFilter({
      id: payload.sub,
    });
    if (!user || !user.refresh_token) return null;

    const tokenMatches = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!tokenMatches) return null;

    return user;
  }
}
