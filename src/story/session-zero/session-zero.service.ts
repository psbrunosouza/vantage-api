import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../../core/database/database.module.js';
import { SystemsService } from '../../system/systems/systems.service.js';
import type {
  ReplaceQuestionsDto,
  SessionZeroQuestionDto,
} from './dto/replace-questions.dto.js';
import {
  type SessionZeroQuestion,
  sessionZeroQuestions,
} from './session-zero.schema.js';

const CHOICE_FORMATS: readonly string[] = ['single', 'multiple'];

export function questionRows(
  systemId: string,
  questions: readonly SessionZeroQuestionDto[],
) {
  return questions.map(
    ({ prompt, format, options, min, max, reword, details }, position) => ({
      systemId,
      position,
      prompt,
      format,
      options: CHOICE_FORMATS.includes(format) ? options : [],
      min: format === 'number' ? min : null,
      max: format === 'number' ? max : null,
      reword,
      details: CHOICE_FORMATS.includes(format) ? details : {},
    }),
  );
}

@Injectable()
export class SessionZeroService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly systemsService: SystemsService,
  ) {}

  async findAll(
    userId: string,
    systemId: string,
  ): Promise<SessionZeroQuestion[]> {
    await this.systemsService.ensureVisible(userId, systemId);
    return this.db
      .select()
      .from(sessionZeroQuestions)
      .where(eq(sessionZeroQuestions.systemId, systemId))
      .orderBy(asc(sessionZeroQuestions.position));
  }

  async replace(
    userId: string,
    systemId: string,
    dto: ReplaceQuestionsDto,
  ): Promise<SessionZeroQuestion[]> {
    await this.systemsService.ensureOwner(userId, systemId);

    await this.db.transaction(async (tx) => {
      await tx
        .delete(sessionZeroQuestions)
        .where(eq(sessionZeroQuestions.systemId, systemId));

      if (dto.questions.length > 0) {
        await tx
          .insert(sessionZeroQuestions)
          .values(questionRows(systemId, dto.questions));
      }
    });

    return this.findAll(userId, systemId);
  }
}
