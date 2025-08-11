import { ApiProperty } from '@nestjs/swagger';

export enum NotificationStatus {
  PENDING = 'PENDENTE',
  PROCESSING = 'PROCESSANDO',
  PROCESSADO_SUCESSO = 'PROCESSADO_SUCESSO',
  FALHA_PROCESSAMENTO = 'FALHA_PROCESSAMENTO',
}

export class NotificationResponseDto {
  @ApiProperty({
    description: 'ID único da mensagem (GUID/UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  mensagemId: string;

  @ApiProperty({
    description: 'Conteúdo da mensagem',
    example: 'Esta é uma mensagem de teste para processamento',
  })
  conteudoMensagem: string;

  @ApiProperty({
    description: 'Status atual da notificação',
    enum: NotificationStatus,
    example: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @ApiProperty({
    description: 'Timestamp de criação',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp da última atualização',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Mensagem de erro (se houver)',
    example: 'Falha no processamento da mensagem',
    required: false,
  })
  error?: string;
}
