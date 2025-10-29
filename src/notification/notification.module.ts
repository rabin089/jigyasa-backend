import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Idea } from 'src/ideas/entities/idea.entity';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationController } from './notification.controller';
import { Notification } from './notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Idea, Notification]), AuthModule],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationGateway],
  controllers: [NotificationController]
})
export class NotificationModule {}
