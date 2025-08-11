import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import {
  NotificationResponseDto,
  NotificationStatus,
} from '../dto/notification-response.dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import {
  INotification,
  ProcessNotificationData,
} from '../interfaces/notification.interface';
import { NotificationStorageService } from './notification-storage.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private client: ClientProxy;

  constructor(
    private readonly storageService: NotificationStorageService,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
        queue: process.env.RABBITMQ_QUEUE || 'notifications',
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log('Connected to RabbitMQ');
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.log('Disconnected from RabbitMQ');
  }

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    // Gerar mensagemId se não fornecido
    const mensagemId = createNotificationDto.mensagemId || require('uuid').v4();

    // Criar notificação no armazenamento em memória
    const notification = this.storageService.create({
      mensagemId,
      conteudoMensagem: createNotificationDto.conteudoMensagem,
      status: NotificationStatus.PENDING,
    });

    this.logger.log(`Created notification with ID: ${notification.mensagemId}`);

    // Emitir evento via WebSocket
    this.notificationGateway.emitNotificationUpdate(notification);

    // Publicar mensagem no RabbitMQ para processamento assíncrono
    try {
      await this.client
        .emit('process_notification', {
          mensagemId: notification.mensagemId,
          conteudoMensagem: notification.conteudoMensagem,
        })
        .toPromise();

      this.logger.log(
        `Published notification ${notification.mensagemId} to RabbitMQ`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish notification ${notification.mensagemId} to RabbitMQ:`,
        error,
      );

      // Atualizar status para falha
      const updatedNotification = this.storageService.updateStatus(
        notification.mensagemId,
        NotificationStatus.FALHA_PROCESSAMENTO,
        'Failed to publish to message queue',
      );

      if (updatedNotification) {
        this.notificationGateway.emitNotificationUpdate(updatedNotification);
      }
    }

    return this.mapToResponseDto(notification);
  }

  async processNotification(data: ProcessNotificationData): Promise<void> {
    const { mensagemId } = data;
    this.logger.log(`Processing notification: ${mensagemId}`);

    // Atualizar status para processando
    let notification = this.storageService.updateStatus(
      mensagemId,
      NotificationStatus.PROCESSING,
    );
    if (!notification) {
      this.logger.error(`Notification ${mensagemId} not found`);
      return;
    }

    this.notificationGateway.emitNotificationUpdate(notification);

    try {
      // Simular processamento assíncrono (1-2 segundos)
      await this.simulateProcessing();

      // Gerar número aleatório de 1 a 10. Se <= 2 (20% de chance), falha
      const randomNumber = Math.floor(Math.random() * 10) + 1;
      const shouldFail = randomNumber <= 2;

      if (shouldFail) {
        throw new Error('Simulated processing failure');
      }

      // Sucesso no processamento
      notification = this.storageService.updateStatus(
        mensagemId,
        NotificationStatus.PROCESSADO_SUCESSO,
      );
      this.logger.log(`Successfully processed notification: ${mensagemId}`);

      // Publicar status na fila de status
      await this.publishStatusUpdate(mensagemId, 'PROCESSADO_SUCESSO');
    } catch (error) {
      // Falha no processamento
      notification = this.storageService.updateStatus(
        mensagemId,
        NotificationStatus.FALHA_PROCESSAMENTO,
        error.message,
      );
      this.logger.error(
        `Failed to process notification ${mensagemId}:`,
        error.message,
      );

      // Publicar status na fila de status
      await this.publishStatusUpdate(mensagemId, 'FALHA_PROCESSAMENTO');
    }

    if (notification) {
      this.notificationGateway.emitNotificationUpdate(notification);
    }
  }

  getNotification(mensagemId: string): NotificationResponseDto | null {
    const notification = this.storageService.findById(mensagemId);
    return notification ? this.mapToResponseDto(notification) : null;
  }

  getAllNotifications(): NotificationResponseDto[] {
    const notifications = this.storageService.findAll();
    return notifications.map((notification) =>
      this.mapToResponseDto(notification),
    );
  }

  private async simulateProcessing(): Promise<void> {
    // Simular tempo de processamento entre 1-2 segundos
    const processingTime = Math.random() * 1000 + 1000;
    await new Promise((resolve) => setTimeout(resolve, processingTime));
  }

  private async publishStatusUpdate(
    mensagemId: string,
    status: string,
  ): Promise<void> {
    try {
      const statusClient = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: `${process.env.RABBITMQ_QUEUE || 'notifications'}_status`,
          queueOptions: {
            durable: true,
          },
        },
      });

      await statusClient.connect();
      await statusClient
        .emit('notification_status', {
          mensagemId,
          status,
        })
        .toPromise();
      await statusClient.close();

      this.logger.log(`Published status update for ${mensagemId}: ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish status update for ${mensagemId}:`,
        error,
      );
    }
  }

  private mapToResponseDto(
    notification: INotification,
  ): NotificationResponseDto {
    return {
      mensagemId: notification.mensagemId,
      conteudoMensagem: notification.conteudoMensagem,
      status: notification.status,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      error: notification.error,
    };
  }
}
