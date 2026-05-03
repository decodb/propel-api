import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/jwt.types';
import { getEnv } from 'src/common/config/env';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          email: dto.email,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          email: true,
          role: true,
          passwordHash: true,
          isVerified: true,
          company: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!user || !user.isVerified) {
        throw new UnauthorizedException(
          'Invalid credentials or email not verified. ',
        );
      }

      if (user.company?.status !== 'APPROVED') {
        throw new UnauthorizedException('Company account is inactive.');
      }

      const passwordsMatch = await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );

      if (!passwordsMatch) {
        throw new UnauthorizedException('Invalid credentials. ');
      }

      const { id, email, role, company } = user;

      const { accessToken, refreshToken } = this.generateTokens({
        sub: id,
        email,
        role,
        companyId: company?.id,
      });

      return { accessToken, refreshToken };
    });

    return result;
  }

  async adminLogin(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!admin) {
      throw new NotFoundException('Invalid credentials. ');
    }

    const passwordsMatch = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!passwordsMatch) {
      throw new UnauthorizedException('Invalid credentials. ');
    }

    const { id, email } = admin;

    const { accessToken, refreshToken } = this.generateTokens({
      sub: id,
      email,
      role: 'SYSTEM_ADMIN',
    });

    return { accessToken, refreshToken };
  }

  private generateTokens(payload: JwtPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: getEnv('JWT_ACCESS_SECRET'),
      expiresIn: parseInt(getEnv('JWT_ACCESS_TTL')),
    });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: getEnv('JWT_REFRESH_SECRET'),
        expiresIn: parseInt(getEnv('JWT_REFRESH_TTL')),
      },
    );
  }
}
