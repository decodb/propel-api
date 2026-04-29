import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Industry } from 'src/generated/prisma/enums';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(Industry)
  industry!: Industry;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateAdminWithCompanyDto {
  @ValidateNested()
  @Type(() => CreateUserDto)
  user!: CreateUserDto;

  @ValidateNested()
  @Type(() => CreateCompanyDto)
  company!: CreateCompanyDto;
}
