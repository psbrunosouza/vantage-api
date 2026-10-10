import type { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { openAPI } from 'better-auth/plugins';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Resend } from 'resend';
import type { Env } from '../env.js';
import { authEmail, type AuthEmailKind } from './auth-emails.js';
import * as schema from './auth.schema.js';
import { LOCALES, acceptedLocale, localeOf, parseLocale } from './locales.js';

export function createAuth(
  db: NodePgDatabase,
  config: ConfigService<Env, true>,
) {
  const resend = new Resend(config.get('RESEND_API_KEY', { infer: true }));
  const from = config.get('EMAIL_FROM', { infer: true });

  const sendEmail = async (
    kind: AuthEmailKind,
    user: { email: string },
    url: string,
  ) => {
    const locale = localeOf('locale' in user ? user.locale : undefined);
    const { subject, text } = authEmail(kind, locale, url);
    const { error } = await resend.emails.send({
      from,
      to: user.email,
      subject,
      text,
    });
    if (error) throw new Error(error.message);
  };

  return betterAuth({
    baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
    basePath: '/api/auth',
    secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
    trustedOrigins: config.get('TRUSTED_ORIGINS', { infer: true }),
    database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
    advanced: { database: { generateId: 'uuid' } },
    user: {
      additionalFields: {
        role: {
          type: ['COMMON', 'SYSTEM'],
          required: false,
          defaultValue: 'COMMON',
          input: false,
        },
        locale: {
          type: [...LOCALES],
          required: false,
          input: true,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => ({
            data: {
              ...user,
              locale:
                parseLocale(user.locale) ??
                acceptedLocale(ctx?.headers?.get('accept-language')),
            },
          }),
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email') return;

        const existing = await ctx.context.internalAdapter.findUserByEmail(
          ctx.body.email,
        );
        if (existing) {
          throw new APIError('UNPROCESSABLE_ENTITY', {
            code: 'USER_ALREADY_EXISTS',
            message: 'User already exists.',
          });
        }
      }),
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) => sendEmail('reset', user, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => sendEmail('verify', user, url),
    },
    socialProviders: {
      google: {
        clientId: config.get('GOOGLE_CLIENT_ID', { infer: true }),
        clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      },
      discord: {
        clientId: config.get('DISCORD_CLIENT_ID', { infer: true }),
        clientSecret: config.get('DISCORD_CLIENT_SECRET', { infer: true }),
      },
    },
    plugins: [openAPI({ disableDefaultReference: true })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
