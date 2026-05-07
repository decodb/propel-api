import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/jwt.types';
import { getEnv } from 'src/common/config/env';
import * as crypto from 'crypto';
import { MailService } from 'src/core/mail/mail.service';
import { MailTemplate } from 'src/core/mail/mail.types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mail: MailService,
    private config: ConfigService,
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
        throw new NotFoundException(
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

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        firstName: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'A reset password email has been your email. ',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const forgotPasswordToken = await this.prisma.forgotPasswordToken.upsert({
      where: { userId: user.id },
      create: {
        token: tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        userId: user.id,
      },
      update: {
        token: tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
      },
    });

    if (!forgotPasswordToken) {
      throw new InternalServerErrorException(
        'Something went wrong. Please try again. ',
      );
    }

    const resetPasswordUrl = `http://localhost:${process.env.PORT}/auth/reset-password?token=${token}`;

    await this.mail.sendMail({
      to: user.email,
      template: MailTemplate.FORGOT_PASSWORD,
      context: {
        FIRST_NAME: user.firstName,
        RESET_URL: resetPasswordUrl,
      },
    });

    return {
      messge: 'A reset password email has been your email. ',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const incomingHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const forgotPasswordToken =
      await this.prisma.forgotPasswordToken.findUnique({
        where: { token: incomingHash },
      });

    const now = new Date();

    if (!forgotPasswordToken || now > new Date(forgotPasswordToken.expiresAt)) {
      throw new ConflictException('Invalid token or token expired. ');
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      parseInt(this.config.getOrThrow('PASSWORD_SALT_ROUNDS'), 10),
    );

    await this.prisma.user.update({
      where: { id: forgotPasswordToken.userId },
      data: {
        passwordHash: passwordHash,
        updatedAt: new Date(),
      },
    });

    await this.prisma.forgotPasswordToken.delete({
      where: { token: incomingHash },
    });

    return {
      message:
        'Your password was updated successfully. You can now log in with your new password.',
    };
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
