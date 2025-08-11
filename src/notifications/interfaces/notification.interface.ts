import { NotificationStatus } from '../dto/notification-response.dto';

export interface INotification {
  mensagemId: string;
  conteudoMensagem: string;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface ProcessNotificationData {
  mensagemId: string;
  conteudoMensagem: string;
}

export interface INotificationStorage {
  create(
    notification: Omit<INotification, 'createdAt' | 'updatedAt'>,
  ): INotification;
  findById(mensagemId: string): INotification | undefined;
  findAll(): INotification[];
  updateStatus(
    mensagemId: string,
    status: NotificationStatus,
    error?: string,
  ): INotification | undefined;
  delete(mensagemId: string): boolean;
}
