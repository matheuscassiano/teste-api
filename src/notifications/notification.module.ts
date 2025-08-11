import { Module } from '@nestjs/common';
import { NotificationHttpModule } from './modules/notification-http.module';
import { NotificationMessagingModule } from './modules/notification-messaging.module';

@Module({
  imports: [NotificationHttpModule, NotificationMessagingModule],
})
export class NotificationModule {}
