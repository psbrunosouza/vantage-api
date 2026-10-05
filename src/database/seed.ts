import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import { accounts, users } from '../auth/auth.schema.js';

const env = z
  .object({
    DATABASE_URL: z.url(),
    SYSTEM_USER_NAME: z.string().min(1),
    SYSTEM_USER_EMAIL: z.email(),
    SYSTEM_USER_PASSWORD: z.string().min(8),
  })
  .parse(process.env);

const email = env.SYSTEM_USER_EMAIL.toLowerCase();
const db = drizzle(env.DATABASE_URL);

const [existing] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, email));

if (existing) {
  console.log(`User ${email} already exists. Nothing changed.`);
} else {
  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: env.SYSTEM_USER_NAME,
        email,
        emailVerified: true,
        role: 'SYSTEM',
      })
      .returning({ id: users.id });

    await tx.insert(accounts).values({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await hashPassword(env.SYSTEM_USER_PASSWORD),
    });
  });
  console.log(`SYSTEM user ${email} created.`);
}

await db.$client.end();
