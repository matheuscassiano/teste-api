import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors({
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Configurar microservice RabbitMQ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: process.env.RABBITMQ_QUEUE || 'notifications',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Notificações')
    .setDescription(
      'API para sistema de notificações assíncronas com RabbitMQ e WebSockets',
    )
    .setVersion('1.0')
    .addTag('Notificações', 'Endpoints para gerenciamento de notificações')
    .addTag('Autenticação', 'Endpoints para autenticação JWT')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Iniciar microservice
  await app.startAllMicroservices();
  console.log('RabbitMQ microservice started');

  // Iniciar servidor HTTP
  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
  );
  console.log(
    `WebSocket server running on: ws://localhost:${process.env.PORT ?? 3000}/notifications`,
  );
}
bootstrap();
