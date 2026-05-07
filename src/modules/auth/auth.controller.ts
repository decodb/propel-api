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
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'System users login and receive JWT cookies. ' })
  @ApiResponse({ status: 400, description: 'Invalid credentials. ' })
  @ApiResponse({ status: 401, description: 'Company account is inactive. ' })
  @ApiResponse({
    status: 404,
    description: 'Invalid credentials or email not verified. ',
  })
  @ApiResponse({ status: 200, description: 'Logged in successfully. ' })
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

  @ApiOperation({ summary: 'System admin login and receive JWT cookies. ' })
  @ApiResponse({ status: 400, description: 'Invalid credentials. ' })
  @ApiResponse({ status: 404, description: 'Invalid credentails. ' })
  @ApiResponse({ status: 200, description: 'Logged in successfully. ' })
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

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Clear JWT cookies' })
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('access_token', '', { maxAge: 0 });
    res.cookie('refresh_token', '', { maxAge: 0, path: '/auth/refresh' });
    return { message: 'Logged out' };
  }

  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Sends the user an email with reset password link' })
  @ApiResponse({ status: 400, description: 'Invalid credentials. ' })
  @ApiResponse({
    status: 404,
    description: 'A reset password email has been your email. ',
  })
  @ApiResponse({
    status: 200,
    description: 'An email with a reset password link sent to your email. ',
  })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: forgotPasswordDto) {
    if (!dto.email) {
      throw new BadRequestException('Please fill in the require information. ');
    }

    const message = await this.authService.forgotPassword(dto.email);
    return message;
  }

  @ApiOperation({ summary: 'Resets a user password.' })
  @ApiResponse({ status: 400, description: 'Token missing or is invalid' })
  @ApiResponse({ status: 409, description: 'Invalid token or token expired. ' })
  @ApiResponse({
    status: 200,
    description:
      'Your password was updated successfully. You can now log in with your new password.',
  })
  @ApiQuery({ name: 'token', required: true })
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
