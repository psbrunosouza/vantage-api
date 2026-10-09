import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { z } from 'zod';
import { accounts, users } from '../auth/auth.schema.js';
import { seedSpecies } from '../catalog/species.seed.js';
import { seedThemes } from '../catalog/themes.seed.js';
import { fieldTypes } from '../fields/fields.schema.js';
import {
  templateCategories,
  templates,
} from '../templates/templates.schema.js';

const FIELD_TYPES = [
  {
    id: 'number',
    name: 'Number',
    icon: 'hash',
    description: 'One numeric value.',
  },
  {
    id: 'short-text',
    name: 'Short text',
    icon: 'type',
    description: 'One line of text.',
  },
  {
    id: 'long-text',
    name: 'Long text',
    icon: 'align-left',
    description: 'Free paragraphs.',
  },
  {
    id: 'separator',
    name: 'Separator',
    icon: 'minus',
    description: 'Splits the sheet.',
  },
  {
    id: 'section',
    name: 'Section',
    icon: 'rows-3',
    description: 'Groups fields.',
  },
  {
    id: 'progress',
    name: 'Progress',
    icon: 'gauge',
    description: 'Value over a max.',
  },
  {
    id: 'toggle',
    name: 'Yes / no',
    icon: 'toggle-left',
    description: 'On or off.',
  },
  {
    id: 'choice',
    name: 'Choice',
    icon: 'list',
    description: 'One from a list.',
  },
  {
    id: 'boxes',
    name: 'Boxes',
    icon: 'square-check-big',
    description: 'Many options.',
  },
  {
    id: 'table',
    name: 'Table',
    icon: 'table',
    description: 'Rows and columns.',
  },
  {
    id: 'image',
    name: 'Image',
    icon: 'image',
    description: 'A picture, from face to full art.',
  },
];

const TEMPLATES = [
  {
    id: 'dungeon-fantasy',
    name: 'Dungeon fantasy',
    summary: 'Attributes, skills and slot-based inventory.',
    icon: 'swords',
    color: 'amber',
    categories: [
      { name: 'Characters', icon: 'scroll-text' },
      { name: 'Items', icon: 'package' },
      { name: 'Spells', icon: 'sparkles' },
      { name: 'Monsters', icon: 'skull' },
    ],
  },
  {
    id: 'modern-investigation',
    name: 'Modern investigation',
    summary: 'Clues, contacts and a strain meter.',
    icon: 'search',
    color: 'violet',
    categories: [
      { name: 'Characters', icon: 'scroll-text' },
      { name: 'Clues', icon: 'search' },
      { name: 'Places', icon: 'map' },
      { name: 'Contacts', icon: 'users' },
    ],
  },
  {
    id: 'space-opera',
    name: 'Space opera',
    summary: 'Crew, ship and equipment modules.',
    icon: 'rocket',
    color: 'cyan',
    categories: [
      { name: 'Crew', icon: 'scroll-text' },
      { name: 'Ships', icon: 'rocket' },
      { name: 'Modules', icon: 'layers' },
      { name: 'Factions', icon: 'shapes' },
    ],
  },
  {
    id: 'street-level-heroes',
    name: 'Street-level heroes',
    summary: 'Powers, oaths and the people who depend on you.',
    icon: 'shield',
    color: null,
    categories: [
      { name: 'Heroes', icon: 'scroll-text' },
      { name: 'Powers', icon: 'sparkles' },
      { name: 'Oaths', icon: 'scroll-text' },
      { name: 'Civilians', icon: 'users' },
      { name: 'Rogues', icon: 'skull' },
      { name: 'The city', icon: 'map' },
    ],
  },
];

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

await db.transaction(async (tx) => {
  for (const [position, fieldType] of FIELD_TYPES.entries()) {
    const row = { ...fieldType, position };
    await tx
      .insert(fieldTypes)
      .values(row)
      .onConflictDoUpdate({ target: fieldTypes.id, set: row });
  }

  for (const [position, { categories, ...template }] of TEMPLATES.entries()) {
    const row = { ...template, position };
    await tx
      .insert(templates)
      .values(row)
      .onConflictDoUpdate({ target: templates.id, set: row });
    await tx
      .delete(templateCategories)
      .where(eq(templateCategories.templateId, template.id));
    await tx.insert(templateCategories).values(
      categories.map((category, index) => ({
        ...category,
        templateId: template.id,
        position: index,
      })),
    );
  }
});
console.log('Field types and templates seeded.');

await seedThemes(db);
await seedSpecies(db);
console.log('Catalog seeded.');

await db.$client.end();
