import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from 'helmet';

import { GlobalExceptionFilter, LoggingInterceptor, ResponseInterceptor } from '@app/common';

import { ApiModule } from './api.module';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    bufferLogs: true
  });

  const configService = app.get(ConfigService);
  const port = configService.get('app.port', 8080);
  const apiVersion = configService.get('app.version', 1);
  const corsOrigins = configService.get('app.corsOrigins', []);
  const appName = configService.get('app.name', 'backend-platform');
  const nodeEnv = configService.get('app.env', 'development');

  // security
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production',
      crossOriginEmbedderPolicy: false
    })
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // api versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  // global prefix
  app.setGlobalPrefix('api');

  // global pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  // OpenAPI/Swagger
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`${appName} API`)
      .setDescription('Backend Platform API Documentation')
      .setVersion(`v${apiVersion}`)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    Logger.log(`Swagger docs available at http://localhost:${port}/api/docs`, 'Bootstrap');
  }

  await app.listen(port);
  Logger.log(
    `${appName} API is running on http://localhost:${port}/api/v${apiVersion}`,
    'Bootstrap',
  );
}

void bootstrap();
