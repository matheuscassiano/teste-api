import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NotificationConsumer } from '../consumers/notification.consumer';
import { NotificationHttpModule } from './notification-http.module';

@Module({
  imports: [
    NotificationHttpModule,
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: process.env.RABBITMQ_QUEUE || 'notifications',
          queueOptions: {
            durable: true,
          },
          socketOptions: {
            heartbeatIntervalInSeconds: 10,
            reconnectTimeInSeconds: 5,
          },
        },
      },
    ]),
  ],
  controllers: [NotificationConsumer],
})
export class NotificationMessagingModule {}
