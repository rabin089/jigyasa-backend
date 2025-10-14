import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const jwtSecret = process.env.JWT_SECRET || configService.get<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not defined in environment variables');
    }

    this.logger.log(`JWT Strategy initialized with secret length: ${jwtSecret ? jwtSecret.length : 0}`);
  }

  async validate(payload: any): Promise<any> {
    this.logger.log(`JWT payload received:`, payload);

    try {
      const userId = typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
      this.logger.log(`Looking up user with ID: ${userId}`);

      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.log(`User authenticated successfully: ${user.email}`);
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
      };
    } catch (error) {
      this.logger.error(`JWT validation error:`, error.message);
      throw error;
    }
  }
}