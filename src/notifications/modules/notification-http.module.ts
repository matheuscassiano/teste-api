import { Module } from '@nestjs/common';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationStorageService } from '../services/notification-storage.service';
import { NotificationService } from '../services/notification.service';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationStorageService,
    NotificationGateway,
  ],
  exports: [
    NotificationService,
    NotificationStorageService,
    NotificationGateway,
  ],
})
export class NotificationHttpModule {}
