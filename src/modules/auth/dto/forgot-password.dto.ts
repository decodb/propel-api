import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class forgotPasswordDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'User email' })
  @IsEmail()
  email!: string;
}
