import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAuthDto {
     @ApiProperty({
        example: 'John Doe',
      })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: 'test@example.com',
      })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        example: 'johndoe089',
      })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        example: 'password',
      })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password: string;
}
