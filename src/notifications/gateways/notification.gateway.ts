import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { INotification } from '../interfaces/notification.interface';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200'], // URL do frontend Angular
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedClients = new Set<string>();

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(
      `Client connected: ${client.id}. Total clients: ${this.connectedClients.size}`,
    );

    // Enviar mensagem de boas-vindas
    client.emit('connected', {
      message: 'Connected to notification service',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(
      `Client disconnected: ${client.id}. Total clients: ${this.connectedClients.size}`,
    );
  }

  // Emitir atualização de notificação para todos os clientes conectados
  emitNotificationUpdate(notification: INotification) {
    this.server.emit('notification_update', {
      mensagemId: notification.mensagemId,
      conteudoMensagem: notification.conteudoMensagem,
      status: notification.status,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      error: notification.error,
    });

    this.logger.log(
      `Emitted notification update for ID: ${notification.mensagemId} to ${this.connectedClients.size} clients`,
    );
  }

  // Emitir notificação para um cliente específico
  emitNotificationToClient(clientId: string, notification: INotification) {
    this.server.to(clientId).emit('notification_update', {
      mensagemId: notification.mensagemId,
      conteudoMensagem: notification.conteudoMensagem,
      status: notification.status,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      error: notification.error,
    });

    this.logger.log(
      `Emitted notification update for ID: ${notification.mensagemId} to client: ${clientId}`,
    );
  }

  // Obter estatísticas de conexão
  getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      clientIds: Array.from(this.connectedClients),
    };
  }
}
