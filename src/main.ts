import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('/api/v1');

  // Enable CORS for Swagger UI
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

const config = new DocumentBuilder()
  .setTitle('Jigyasa API')
  .setDescription('Jigyasa API Documentation')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth', // This key should match the auth decorator
  )
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document, {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    // Ensure the auth is properly configured
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // This helps ensure the auth header is sent with requests
      return req;
    },
  },
  customSiteTitle: 'Jigyasa API Documentation',
});

app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Jigyasa API running on http://localhost:${process.env.PORT ?? 3000}/api/v1`);
}
bootstrap();
