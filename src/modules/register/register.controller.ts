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

@Controller('register')
export class RegisterController {
  constructor(private registerService: RegisterService) {}

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

  @Get('/verify-email')
  verifyEmail(@Query('token') token: string) {
    if (!token) {
      return new NotFoundException('Token missing or invalid. ');
    }

    return this.registerService.verifyEmail(token);
  }
}
