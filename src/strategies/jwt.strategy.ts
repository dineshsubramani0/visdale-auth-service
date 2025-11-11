import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ENV_CONFIG_KEYS } from 'src/utils/constant/env.constant';
import { TokenPayload } from 'src/@types/interfaces/token-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private userTokenFromHeader: string;
  constructor(
    configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = this.extractTokenFromHeader(request);
          this.userTokenFromHeader = token;
          request.currentUser = this.jwtService.decode(token);

          return this.userTokenFromHeader;
        },
      ]),
      secretOrKey: configService.get(ENV_CONFIG_KEYS.JWT_SECRET_KEY),
    });
  }

  async validate(payload: TokenPayload) {
    const { id } = payload;
    console.log(id);

    const userTokenFromRedis = await this.returnString();

    if (userTokenFromRedis !== this.userTokenFromHeader) {
      return false;
    }

    return true;
  }

  async returnString(): Promise<string> {
    return Promise.resolve('true');
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
