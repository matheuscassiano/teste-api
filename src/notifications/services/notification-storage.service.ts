import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  INotification,
  INotificationStorage,
} from '../interfaces/notification.interface';
import { NotificationStatus } from '../dto/notification-response.dto';

@Injectable()
export class NotificationStorageService implements INotificationStorage {
  private notifications: Map<string, INotification> = new Map();

  create(
    notification: Omit<INotification, 'createdAt' | 'updatedAt'>,
  ): INotification {
    const now = new Date();
    const mensagemId = notification.mensagemId || uuidv4();

    const newNotification: INotification = {
      ...notification,
      mensagemId,
      createdAt: now,
      updatedAt: now,
    };

    this.notifications.set(mensagemId, newNotification);
    return newNotification;
  }

  findById(mensagemId: string): INotification | undefined {
    return this.notifications.get(mensagemId);
  }

  findAll(): INotification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  updateStatus(
    mensagemId: string,
    status: NotificationStatus,
    error?: string,
  ): INotification | undefined {
    const notification = this.notifications.get(mensagemId);
    if (!notification) {
      return undefined;
    }

    const updatedNotification: INotification = {
      ...notification,
      status,
      error,
      updatedAt: new Date(),
    };

    this.notifications.set(mensagemId, updatedNotification);
    return updatedNotification;
  }

  delete(mensagemId: string): boolean {
    return this.notifications.delete(mensagemId);
  }

  // Método para limpar notificações antigas (opcional)
  cleanup(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.createdAt < cutoffTime) {
        this.notifications.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
