import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AppModule } from './app.module.js';
import type { Auth } from './auth/auth.js';
import type { Env } from './env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const auth = app.get<AuthService<Auth>>(AuthService);

  app.setGlobalPrefix('api');

  const authDocument = await auth.api.generateOpenAPISchema();
  const authBasePath = auth.instance.options.basePath;
  const swagger = new DocumentBuilder().setTitle('Vantage API').build();

  SwaggerModule.setup(
    'docs',
    app,
    (): OpenAPIObject => {
      const document = SwaggerModule.createDocument(app, swagger);
      const authPaths = Object.entries(authDocument.paths).map(
        ([path, item]) => [`${authBasePath}${path}`, item],
      );
      return {
        ...document,
        paths: {
          ...document.paths,
          ...(Object.fromEntries(authPaths) as OpenAPIObject['paths']),
        },
        components: {
          ...document.components,
          schemas: {
            ...document.components?.schemas,
            ...(authDocument.components.schemas as NonNullable<
              OpenAPIObject['components']
            >['schemas']),
          },
        },
      };
    },
    { useGlobalPrefix: true },
  );

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
