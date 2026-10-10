import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { JourneysService } from '../journeys/journeys.service.js';
import { structures } from '../structures/structures.schema.js';
import type {
  ReplaceQuestionsDto,
  SessionZeroQuestionDto,
} from './dto/replace-questions.dto.js';
import {
  type SessionZeroQuestion,
  sessionZeroQuestions,
} from './session-zero.schema.js';

export function foreignStructureIds(
  questions: readonly SessionZeroQuestionDto[],
  journeyStructureIds: readonly string[],
): string[] {
  const owned = new Set(journeyStructureIds);

  return questions
    .flatMap((question) => [question.structureId, question.sourceStructureId])
    .filter((id): id is string => id !== null && !owned.has(id));
}

@Injectable()
export class SessionZeroService {
  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly journeysService: JourneysService,
  ) {}

  async findAll(
    userId: string,
    journeyId: string,
  ): Promise<SessionZeroQuestion[]> {
    await this.journeysService.ensureVisible(userId, journeyId);
    return this.db
      .select()
      .from(sessionZeroQuestions)
      .where(eq(sessionZeroQuestions.journeyId, journeyId))
      .orderBy(asc(sessionZeroQuestions.position));
  }

  async replace(
    userId: string,
    journeyId: string,
    dto: ReplaceQuestionsDto,
  ): Promise<SessionZeroQuestion[]> {
    await this.journeysService.ensureOwner(userId, journeyId);

    const owned = await this.db
      .select({ id: structures.id })
      .from(structures)
      .where(eq(structures.journeyId, journeyId));

    if (
      foreignStructureIds(
        dto.questions,
        owned.map(({ id }) => id),
      ).length > 0
    ) {
      throw new BadRequestException({
        code: 'STRUCTURE_NOT_FOUND',
        message: 'Structure not found.',
      });
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(sessionZeroQuestions)
        .where(eq(sessionZeroQuestions.journeyId, journeyId));

      if (dto.questions.length > 0) {
        await tx.insert(sessionZeroQuestions).values(
          dto.questions.map((question, position) => ({
            ...question,
            journeyId,
            position,
          })),
        );
      }
    });

    return this.findAll(userId, journeyId);
  }
}
