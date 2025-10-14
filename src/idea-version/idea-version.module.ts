import { Module } from '@nestjs/common';
import { IdeaVersionService } from './idea-version.service';
import { IdeaVersionController } from './idea-version.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdeaVersion } from './entities/idea-version.entity';
import { User } from 'src/user/entities/user.entity';
import { Idea } from 'src/ideas/entities/idea.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdeaVersion, User, Idea])
  ],
  providers: [IdeaVersionService],
  controllers: [IdeaVersionController]
})
export class IdeaVersionModule {}
