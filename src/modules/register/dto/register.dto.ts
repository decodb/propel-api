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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Password (min 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    enum: Industry,
    example: Industry.TECHNOLOGY,
    description: 'Industry sector of the company',
  })
  @IsEnum(Industry)
  industry!: Industry;

  @ApiPropertyOptional({
    example: 'https://acme.com',
    description: 'Company website URL',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: '+27 84 048 4407',
    description: 'Company phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateAdminWithCompanyDto {
  @ApiProperty({ type: CreateUserDto, description: 'Admin user details' })
  @ValidateNested()
  @Type(() => CreateUserDto)
  user!: CreateUserDto;

  @ApiProperty({ type: CreateCompanyDto, description: 'Company details' })
  @ValidateNested()
  @Type(() => CreateCompanyDto)
  company!: CreateCompanyDto;
}

export class AuthRegisterResponseDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;
}
