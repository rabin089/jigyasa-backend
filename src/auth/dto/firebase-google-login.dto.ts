import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FirebaseGoogleLoginDto {
  @ApiProperty({
    description: 'Firebase ID token returned after Google sign-in on the client',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
