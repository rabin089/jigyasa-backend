import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { FirebaseGoogleLoginDto } from './dto/firebase-google-login.dto';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('/google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() firebaseGoogleLoginDto: FirebaseGoogleLoginDto) {
    return this.authService.googleLogin(firebaseGoogleLoginDto.idToken);
  }

  @Post('/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }
}
