import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notificações')
@Controller('api')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @Post('notificar')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Criar nova notificação',
    description:
      'Cria uma nova notificação e a envia para processamento assíncrono via RabbitMQ',
  })
  @ApiResponse({
    status: 202,
    description: 'Notificação aceita para processamento assíncrono',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos',
  })
  async createNotification(
    @Body(ValidationPipe) createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return await this.notificationService.createNotification(
      createNotificationDto,
    );
  }

  @Get('notifications/stats/connections')
  @ApiOperation({
    summary: 'Estatísticas de conexões WebSocket',
    description: 'Retorna informações sobre as conexões WebSocket ativas',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de conexão retornadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        connectedClients: {
          type: 'number',
          description: 'Número de clientes conectados',
          example: 3,
        },
        clientIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs dos clientes conectados',
          example: ['client-1', 'client-2', 'client-3'],
        },
      },
    },
  })
  @Get('stats/connections')
  getConnectionStats() {
    return this.notificationGateway.getConnectionStats();
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'Listar todas as notificações',
    description: 'Retorna todas as notificações armazenadas em memória',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada com sucesso',
    type: [NotificationResponseDto],
  })
  getAllNotifications(): NotificationResponseDto[] {
    return this.notificationService.getAllNotifications();
  }

  @Get('notifications/:mensagemId')
  @ApiOperation({
    summary: 'Buscar notificação por ID',
    description: 'Retorna uma notificação específica pelo seu ID',
  })
  @ApiParam({
    name: 'mensagemId',
    description: 'ID da mensagem (UUID)',
    example: 'uuid-123-456-789',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificação encontrada',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notificação não encontrada',
  })
  getNotification(
    @Param('mensagemId') mensagemId: string,
  ): NotificationResponseDto {
    const notification = this.notificationService.getNotification(mensagemId);

    if (!notification) {
      throw new NotFoundException(
        `Notificação com ID ${mensagemId} não encontrada`,
      );
    }

    return notification;
  }
}
