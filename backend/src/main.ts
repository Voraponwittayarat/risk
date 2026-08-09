import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for the frontend
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Ensure upload directory exists and serve it statically
  const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory at: ${uploadDir}`);
  } else {
    console.log(`Using upload directory at: ${uploadDir}`);
  }
  app.use('/uploads', express.static(uploadDir));
  app.use('/riskimage', express.static(uploadDir));

  const config = new DocumentBuilder()
    .setTitle('Hospital Risk Management API')
    .setDescription('The API for managing hospital risks')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
