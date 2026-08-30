import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuredOrigins = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Requests without an Origin header include CLI/health-check traffic.
      if (!origin) return callback(null, true);
      const isLocalDevelopment = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (configuredOrigins.includes(origin) || (configuredOrigins.length === 0 && isLocalDevelopment)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS policy'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Ensure upload directory exists. Incident attachments are intentionally not
  // exposed as public static files; they are served by an authenticated endpoint.
  const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory at: ${uploadDir}`);
  } else {
    console.log(`Using upload directory at: ${uploadDir}`);
  }

  const config = new DocumentBuilder()
    .setTitle('Hospital Risk Management API')
    .setDescription('The API for managing hospital risks')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    SwaggerModule.setup('api', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
