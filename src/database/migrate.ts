import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { z } from 'zod';

const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
const db = drizzle(env.DATABASE_URL);

await migrate(db, { migrationsFolder: 'drizzle' });
console.log('Migrations applied.');

await db.$client.end();
