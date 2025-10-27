import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Idea } from 'src/ideas/entities/idea.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Idea]), AuthModule],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationGateway]
})
export class NotificationModule {}
