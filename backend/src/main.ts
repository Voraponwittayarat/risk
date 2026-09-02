import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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

  // In production the backend also serves the compiled React application.
  // API requests use JSON Accept headers, while direct browser navigation to
  // React routes requests HTML and receives index.html for client-side routing.
  if (process.env.NODE_ENV === 'production') {
    const frontendDistDir = resolve(process.env.FRONTEND_DIST_DIR || '../frontend/dist');
    const frontendIndex = join(frontendDistDir, 'index.html');
    if (!existsSync(frontendIndex)) {
      throw new Error(`Production frontend is missing: ${frontendIndex}. Run npm run build in the frontend directory.`);
    }
    app.useStaticAssets(frontendDistDir, { index: false });
    app.use((req: any, res: any, next: any) => {
      const acceptsHtml = String(req.headers.accept || '').includes('text/html');
      if (req.method === 'GET' && acceptsHtml) {
        return res.sendFile(frontendIndex);
      }
      return next();
    });
  }

  await app.listen(process.env.PORT ?? 3000, process.env.HOST || '0.0.0.0');
}
bootstrap();
