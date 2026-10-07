import type { Locale } from './locales.js';

export type AuthEmailKind = 'verify' | 'reset';

interface AuthEmailCopy {
  subject: string;
  intro: string;
}

const COPY: Record<Locale, Record<AuthEmailKind, AuthEmailCopy>> = {
  en: {
    verify: {
      subject: 'Verify your email',
      intro: 'Open this link to verify your email:',
    },
    reset: {
      subject: 'Reset your password',
      intro: 'Open this link to choose a new password:',
    },
  },
  'pt-BR': {
    verify: {
      subject: 'Confirme seu email',
      intro: 'Abra este link para confirmar seu email:',
    },
    reset: {
      subject: 'Redefina sua senha',
      intro: 'Abra este link para escolher uma nova senha:',
    },
  },
  'zh-CN': {
    verify: {
      subject: '验证你的邮箱',
      intro: '打开此链接验证你的邮箱：',
    },
    reset: {
      subject: '重置你的密码',
      intro: '打开此链接设置新密码：',
    },
  },
  es: {
    verify: {
      subject: 'Verifica tu correo',
      intro: 'Abre este enlace para verificar tu correo:',
    },
    reset: {
      subject: 'Restablece tu contraseña',
      intro: 'Abre este enlace para elegir una nueva contraseña:',
    },
  },
};

export function authEmail(
  kind: AuthEmailKind,
  locale: Locale,
  url: string,
): { subject: string; text: string } {
  const { subject, intro } = COPY[locale][kind];
  return { subject, text: `${intro}\n\n${url}` };
}
