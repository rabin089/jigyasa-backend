import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { Type } from 'class-transformer';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { IdeasModule } from './ideas/ideas.module';
import { CommentModule } from './comment/comment.module';
import { IdeaVersionModule } from './idea-version/idea-version.module';
import { NotificationModule } from './notification/notification.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    UserModule,
    AuthModule,
    IdeasModule,
    CommentModule,
    IdeaVersionModule,
    NotificationModule,
    EventEmitterModule.forRoot(),
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
