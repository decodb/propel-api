import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { RegisterService } from './register.service';
import { CreateAdminWithCompanyDto } from './dto/register.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Register')
@Controller('register')
export class RegisterController {
  constructor(private registerService: RegisterService) {}

  @ApiOperation({ summary: 'Company and Admin registration. ' })
  @ApiResponse({
    status: 200,
    description:
      'Registration successfully completed. An email with an verification link has been sent to your email. ',
  })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  register(
    @Body() dto: CreateAdminWithCompanyDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required. ');
    }
    return this.registerService.register(dto, file);
  }

  @ApiOperation({ summary: 'Verifies the company admin email. ' })
  @ApiResponse({
    status: 200,
    description: 'Email Verified. Please continue to login. ',
  })
  @Get('/verify-email')
  verifyEmail(@Query('token') token: string) {
    if (!token) {
      return new NotFoundException('Token missing or invalid. ');
    }

    return this.registerService.verifyEmail(token);
  }
}
