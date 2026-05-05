import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
    console.log('[JwtStrategy] Initialized with secret:', (process.env.JWT_SECRET || 'default-secret').slice(0, 4) + '***');
  }

  async validate(payload: { sub: string }) {
    console.log('[JwtStrategy] Validating payload:', payload);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      console.log('[JwtStrategy] User not found:', payload.sub);
      throw new UnauthorizedException();
    }

    console.log('[JwtStrategy] User found:', user.username);
    return { id: user.id, username: user.username };
  }
}
