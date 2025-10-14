import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { User } from 'src/user/entities/user.entity';
import { Idea } from 'src/ideas/entities/idea.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, User, Idea]),
  ],
  providers: [CommentService],
  controllers: [CommentController]
})
export class CommentModule {}
