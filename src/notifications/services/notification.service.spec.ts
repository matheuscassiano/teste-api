import { Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationStatus } from '../dto/notification-response.dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import { INotification } from '../interfaces/notification.interface';
import { NotificationStorageService } from './notification-storage.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let storageService: jest.Mocked<NotificationStorageService>;
  let notificationGateway: jest.Mocked<NotificationGateway>;
  let clientProxy: jest.Mocked<ClientProxy>;

  const mockNotification: INotification = {
    mensagemId: '123e4567-e89b-12d3-a456-426614174000',
    conteudoMensagem: 'Test message',
    status: NotificationStatus.PENDING,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  };

  beforeEach(async () => {
    const mockStorageService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    };

    const mockNotificationGateway = {
      emitNotificationUpdate: jest.fn(),
    };

    const mockClientProxy = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationStorageService,
          useValue: mockStorageService,
        },
        {
          provide: NotificationGateway,
          useValue: mockNotificationGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    storageService = module.get(NotificationStorageService);
    notificationGateway = module.get(NotificationGateway);

    // Mock do ClientProxy criado internamente
    (service as any).client = mockClientProxy;
    clientProxy = mockClientProxy;

    // Mock do Logger para evitar logs durante os testes
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification and publish to RabbitMQ successfully', async () => {
      // Arrange
      const createDto: CreateNotificationDto = {
        conteudoMensagem: 'Test message',
      };

      storageService.create.mockReturnValue(mockNotification);

      // Act
      const result = await service.createNotification(createDto);

      // Assert
      expect(storageService.create).toHaveBeenCalledWith({
        mensagemId: expect.any(String),
        conteudoMensagem: 'Test message',
        status: NotificationStatus.PENDING,
      });

      expect(notificationGateway.emitNotificationUpdate).toHaveBeenCalledWith(
        mockNotification,
      );

      expect(clientProxy.emit).toHaveBeenCalledWith('process_notification', {
        mensagemId: mockNotification.mensagemId,
        conteudoMensagem: mockNotification.conteudoMensagem,
      });

      expect(result).toEqual({
        mensagemId: mockNotification.mensagemId,
        conteudoMensagem: mockNotification.conteudoMensagem,
        status: mockNotification.status,
        createdAt: mockNotification.createdAt,
        updatedAt: mockNotification.updatedAt,
        error: mockNotification.error,
      });
    });

    it('should create notification with provided mensagemId', async () => {
      // Arrange
      const customId = 'custom-id-123';
      const createDto: CreateNotificationDto = {
        mensagemId: customId,
        conteudoMensagem: 'Test message',
      };

      const notificationWithCustomId = {
        ...mockNotification,
        mensagemId: customId,
      };

      storageService.create.mockReturnValue(notificationWithCustomId);

      // Act
      await service.createNotification(createDto);

      // Assert
      expect(storageService.create).toHaveBeenCalledWith({
        mensagemId: customId,
        conteudoMensagem: 'Test message',
        status: NotificationStatus.PENDING,
      });
    });

    it('should handle RabbitMQ publish failure and update notification status', async () => {
      // Arrange
      const createDto: CreateNotificationDto = {
        conteudoMensagem: 'Test message',
      };

      const updatedNotification = {
        ...mockNotification,
        status: NotificationStatus.FALHA_PROCESSAMENTO,
        error: 'Failed to publish to message queue',
      };

      storageService.create.mockReturnValue(mockNotification);
      storageService.updateStatus.mockReturnValue(updatedNotification);

      // Mock RabbitMQ failure
      clientProxy.emit.mockReturnValue({
        toPromise: jest
          .fn()
          .mockRejectedValue(new Error('RabbitMQ connection failed')),
      });

      // Act
      await service.createNotification(createDto);

      // Assert
      expect(storageService.updateStatus).toHaveBeenCalledWith(
        mockNotification.mensagemId,
        NotificationStatus.FALHA_PROCESSAMENTO,
        'Failed to publish to message queue',
      );

      expect(notificationGateway.emitNotificationUpdate).toHaveBeenCalledTimes(
        2,
      );
      expect(
        notificationGateway.emitNotificationUpdate,
      ).toHaveBeenNthCalledWith(1, mockNotification);
      expect(
        notificationGateway.emitNotificationUpdate,
      ).toHaveBeenNthCalledWith(2, updatedNotification);
    });

    it('should verify RabbitMQ publish method is called with correct arguments', async () => {
      // Arrange
      const createDto: CreateNotificationDto = {
        mensagemId: 'test-id-123',
        conteudoMensagem: 'Test message content',
      };

      const testNotification = {
        ...mockNotification,
        mensagemId: 'test-id-123',
        conteudoMensagem: 'Test message content',
      };

      storageService.create.mockReturnValue(testNotification);

      // Act
      await service.createNotification(createDto);

      // Assert - Verificar se o método de publicação foi chamado com os argumentos corretos
      expect(clientProxy.emit).toHaveBeenCalledTimes(1);
      expect(clientProxy.emit).toHaveBeenCalledWith('process_notification', {
        mensagemId: 'test-id-123',
        conteudoMensagem: 'Test message content',
      });

      // Verificar se toPromise foi chamado para aguardar a publicação
      expect(clientProxy.emit().toPromise).toHaveBeenCalled();
    });
  });

  describe('getNotification', () => {
    it('should return notification when found', () => {
      // Arrange
      storageService.findById.mockReturnValue(mockNotification);

      // Act
      const result = service.getNotification(mockNotification.mensagemId);

      // Assert
      expect(storageService.findById).toHaveBeenCalledWith(
        mockNotification.mensagemId,
      );
      expect(result).toEqual({
        mensagemId: mockNotification.mensagemId,
        conteudoMensagem: mockNotification.conteudoMensagem,
        status: mockNotification.status,
        createdAt: mockNotification.createdAt,
        updatedAt: mockNotification.updatedAt,
        error: mockNotification.error,
      });
    });

    it('should return null when notification not found', () => {
      // Arrange
      storageService.findById.mockReturnValue(undefined);

      // Act
      const result = service.getNotification('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getAllNotifications', () => {
    it('should return all notifications', () => {
      // Arrange
      const notifications = [mockNotification];
      storageService.findAll.mockReturnValue(notifications);

      // Act
      const result = service.getAllNotifications();

      // Assert
      expect(storageService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        mensagemId: mockNotification.mensagemId,
        conteudoMensagem: mockNotification.conteudoMensagem,
        status: mockNotification.status,
        createdAt: mockNotification.createdAt,
        updatedAt: mockNotification.updatedAt,
        error: mockNotification.error,
      });
    });
  });
});
