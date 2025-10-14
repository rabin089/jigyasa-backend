import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}
  async create(createAuthDto: CreateAuthDto) {
    // Input validation
    if (!createAuthDto.email || !createAuthDto.password) {
      throw new Error('Email and password are required');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: {
        email: createAuthDto.email,
      }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createAuthDto.password, salt);

    // Create and save new user
    const newUser = this.userRepository.create(
      {
        ...createAuthDto,
        password: hashedPassword,
      }
    )

    const savedUser = await this.userRepository.save(newUser)

    const {password, ...result} = savedUser

    return result
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email }
    });
    
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payLoad= {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    return{
      access_token: this.jwtService.sign(payLoad),
      user:{
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }

  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

   async logout(token: string) {
    return { message: 'Successfully logged out' };
  }

 

 
}
