import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID único da mensagem (GUID/UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  mensagemId?: string;

  @ApiProperty({
    description: 'Conteúdo da mensagem',
    example: 'Esta é uma mensagem de teste para processamento',
  })
  @IsNotEmpty({ message: 'Conteúdo da mensagem não pode ser vazio' })
  @IsString()
  conteudoMensagem: string;
}
