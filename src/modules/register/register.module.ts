import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { CloudinaryModule } from 'src/integrations/cloudinary/cloudinary.module';
import { MailModule } from 'src/core/mail/mail.module';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  providers: [RegisterService],
  controllers: [RegisterController],
  imports: [
    PrismaModule,
    CloudinaryModule,
    MailModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
})
export class RegisterModule {}
