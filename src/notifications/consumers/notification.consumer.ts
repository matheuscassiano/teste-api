import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from '../services/notification.service';
import type { ProcessNotificationData } from '../interfaces/notification.interface';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern('process_notification')
  async handleNotificationProcessing(@Payload() data: ProcessNotificationData) {
    this.logger.log(
      `Received notification for processing: ${JSON.stringify(data)}`,
    );

    try {
      await this.notificationService.processNotification(data);
    } catch (error) {
      this.logger.error(`Error processing notification:`, error);
    }
  }
}
