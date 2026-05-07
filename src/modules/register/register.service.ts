/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateAdminWithCompanyDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from 'src/integrations/cloudinary/cloudinary.service';
import * as crypto from 'crypto';
import { MailService } from 'src/core/mail/mail.service';
import { MailTemplate } from 'src/core/mail/mail.types';
import { UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  async register(dto: CreateAdminWithCompanyDto, file: Express.Multer.File) {
    const { user, company } = dto;

    // Upload image before transaction so we can rollback if DB fails
    let cloudinaryResponse: UploadApiResponse;
    try {
      cloudinaryResponse = await this.cloudinaryService.uploadFile(file);
    } catch {
      throw new InternalServerErrorException(
        'Image upload failed. Please try again.',
      );
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const createdCompany = await tx.company.create({
          data: {
            name: company.name,
            slug: this.toSlug(company.name),
            industry: company.industry,
            website: company?.website,
            phone: company?.phone,
          },
        });

        const passwordHash = await bcrypt.hash(
          user.password,
          parseInt(this.config.getOrThrow('PASSWORD_SALT_ROUNDS'), 10),
        );

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;

        const createdUser = await tx.user.create({
          data: {
            ...userWithoutPassword,
            passwordHash,
            company: {
              connect: { id: createdCompany.id },
            },
          },
        });

        const createdImage = await tx.companyProfileImage.create({
          data: {
            url: cloudinaryResponse.url,
            publicId: cloudinaryResponse.public_id,
            mimeType: file.mimetype,
            size: file.size,
            company: {
              connect: { id: createdCompany.id },
            },
          },
        });

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
          .createHash('sha256')
          .update(token)
          .digest('hex');

        const createdEmailVerificationToken =
          await tx.emailVerificationToken.upsert({
            where: { userId: createdUser.id },
            create: {
              userId: createdUser.id,
              token: tokenHash,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            },
            update: {
              token: tokenHash,
              isUsed: false,
              usedAt: null,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            },
          });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...safeUser } = createdUser;

        return {
          createdCompany,
          createdUser: safeUser,
          createdImage,
          createdEmailVerificationToken,
          token, // needed for email below
        };
      });

      const verifyUrl = `http://localhost:${process.env.PORT}/register/verify-email?token=${result.token}`;
      // Send emails after transaction commits successfully
      await this.mail.sendMail({
        to: result.createdUser.email,
        template: MailTemplate.EMAIL_VERIFICATION,
        context: {
          VERIFICATION_URL: verifyUrl,
        },
      });

      await this.mail.sendMail({
        to: this.config.getOrThrow('EMAIL_USER'),
        template: MailTemplate.NEW_SIGN_UP,
        context: {
          COMPANY_NAME: result.createdCompany.name,
          COMPANY_INDUSTRY: result.createdCompany.industry,
          COMPANY_WEBSITE:
            result.createdCompany.website ?? 'No website link provided',
          ADMIN_FIRST_NAME: result.createdUser.firstName,
          ADMIN_LAST_NAME: result.createdUser.lastName,
          ADMIN_EMAIL: result.createdUser.email,
          SUBMITTED_AT: new Date(
            result.createdCompany.createdAt,
          ).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        },
      });

      // Return without exposing the token
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token: _, ...response } = result;
      return  { message: 'Registration successfully completed. An email with an verification link has been sent to your email. ' };
    } catch (error) {
      // Rollback cloudinary upload if transaction failed
      await this.cloudinaryService.deleteFile(cloudinaryResponse.public_id);
      throw error;
    }
  }

  async verifyEmail(token: string) {
    const incomingHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const result = await this.prisma.$transaction(async (tx) => {
      // find the token
      const emailVerificationToken = await tx.emailVerificationToken.findUnique({
          where: {
            token: incomingHash,
          },
      });

      const now = new Date();

      // check if the token is valid
      if (!emailVerificationToken || (now > new Date(emailVerificationToken.expiresAt))) {
        throw new NotFoundException('Invalid token or email already verified.');
      }

      // check if the user is already verified
      const user = await tx.user.findUnique({
        where: {
          id: emailVerificationToken?.userId
        },
        select: {
          isVerified: true
        }
      })

      if (user?.isVerified) {
        throw new ConflictException('Invalid token or email already verified. ');
      }

      await tx.user.update({
        where: {
          id: emailVerificationToken?.userId
        },
        data: {
          isVerified: true
        }
      })

      await tx.emailVerificationToken.delete({
        where: {
          token: incomingHash
        }
      })

      return { message: 'Email Verified. Please continue to login. ' }
      
    })

    return result.message
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-') // replace spaces & special chars with "-"
      .replace(/^-+|-+$/g, ''); // remove leading/trailing "-"
  }
}
