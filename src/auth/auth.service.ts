import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.initializeFirebase();
  }
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

  async googleLogin(idToken: string) {
    let decodedToken: DecodedIdToken;

    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    if (!decodedToken.email) {
      throw new UnauthorizedException('Firebase account does not have an email');
    }

    let user = await this.userRepository.findOne({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: decodedToken.email },
      });
    }

    if (!user) {
      user = await this.createFirebaseUser(decodedToken);
    } else if (!user.firebaseUid) {
      user.firebaseUid = decodedToken.uid;
      user.authProvider = 'google';
      user = await this.userRepository.save(user);
    }

    return this.buildAuthResponse(user);
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

 

  private initializeFirebase() {
    if (getApps().length) {
      return;
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new InternalServerErrorException(
        'Firebase admin credentials are not configured',
      );
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  private async createFirebaseUser(
    decodedToken: DecodedIdToken,
  ): Promise<User> {
    const emailPrefix = decodedToken.email?.split('@')[0] || 'googleuser';
    const username = await this.generateUniqueUsername(emailPrefix);
    const password = await bcrypt.hash(decodedToken.uid, 10);

    const user = this.userRepository.create({
      name: decodedToken.name || emailPrefix,
      email: decodedToken.email,
      username,
      password,
      firebaseUid: decodedToken.uid,
      authProvider: 'google',
    });

    return this.userRepository.save(user);
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    const sanitizedBase = base
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20) || 'googleuser';

    let username = sanitizedBase;
    let suffix = 1;

    while (await this.userRepository.findOne({ where: { username } })) {
      username = `${sanitizedBase}${suffix}`;
      suffix += 1;
    }

    return username;
  }

  private buildAuthResponse(user: User) {
    const payLoad = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payLoad),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
