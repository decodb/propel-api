import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { getEnv } from 'src/common/config/env';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { forgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto) {
      throw new BadRequestException(
        'Please fill in the required information. ',
      );
    }

    const { accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/auth/refresh',
    });

    return { message: 'Logged in successfully. ' };
  }

  @Post('admin/login')
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto) {
      throw new BadRequestException(
        'Please fill in the required information. ',
      );
    }

    const { accessToken, refreshToken } =
      await this.authService.adminLogin(dto);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/auth/refresh',
    });

    return { message: 'Logged in successfully. ' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('access_token', '', { maxAge: 0 });
    res.cookie('refresh_token', '', { maxAge: 0, path: '/auth/refresh' });
    return { message: 'Logged out' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: forgotPasswordDto) {
    if (!dto.email) {
      throw new BadRequestException('Please fill in the require information. ');
    }

    const message = await this.authService.forgotPassword(dto.email);
    return message;
  }

  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    if (!token) {
      throw new BadRequestException('Token missing or is invalid');
    }

    const message = await this.authService.resetPassword(token, dto.password);
    return message;
  }
}
