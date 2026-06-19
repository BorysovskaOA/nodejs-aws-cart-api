import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import serverlessExpress from '@codegenie/serverless-express';
import { AppModule } from './app.module';
import { Callback, Context, Handler } from 'aws-lambda';

let cachedServer: Handler;

async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    app.use(helmet());
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'https://d180fy39z34bng.cloudfront.net',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
      credentials: true,
    });
    await app.init();

    const expressApp = app.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }

  return cachedServer;
}

export const handler: Handler = async (event: any, context: Context) => {
  const method = event.httpMethod || event.requestContext?.http?.method;

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin':
          event.headers?.origin || 'http://localhost:3000',
        'Access-Control-Allow-Headers':
          'Content-Type, Accept, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods':
          'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }
  const server = await bootstrap();
  return server(event, context, {} as Callback);
};
