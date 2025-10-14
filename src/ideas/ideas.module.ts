import { Module } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import { IdeasController } from './ideas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Idea } from './entities/idea.entity';
import { User } from 'src/user/entities/user.entity';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { AuthModule } from 'src/auth/auth.module';
import { IdeaVersion } from 'src/idea-version/entities/idea-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Idea, User, IdeaVersion]),
    AuthModule,
  ],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
