import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { type FieldType, fieldTypes } from './fields.schema.js';

@Injectable()
export class FieldsService {
  constructor(@Inject(DATABASE) private readonly db: NodePgDatabase) {}

  findAll(): Promise<FieldType[]> {
    return this.db.select().from(fieldTypes).orderBy(asc(fieldTypes.position));
  }
}
