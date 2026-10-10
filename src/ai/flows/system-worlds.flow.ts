import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  DraftOption,
  DraftStructure,
  DraftWorld,
} from '../../system-drafts/dto/system-draft.dto.js';
import type { SystemDraft } from '../../system-drafts/system-drafts.schema.js';
import { SystemDraftsService } from '../../system-drafts/system-drafts.service.js';
import { ACTORS_SLUG } from '../../tags/actors.js';
import type { SystemOptionsDto } from '../dto/system-options.dto.js';
import { type DraftSlot, WorldSources } from '../world-source.js';
import { PopulationFlow } from './population.flow.js';
import {
  type StructureProposal,
  StructureProposalsFlow,
} from './structure-proposals.flow.js';
import { type SystemOption, SystemOptionsFlow } from './system-options.flow.js';

export function draftStructuresOf(
  proposals: readonly StructureProposal[],
  actorsTagId: string | undefined,
): DraftStructure[] {
  const missing =
    actorsTagId !== undefined &&
    !proposals.some((proposal) => proposal.tagIds.includes(actorsTagId))
      ? actorsTagId
      : null;

  return proposals.map((proposal, index) => ({
    id: randomUUID(),
    name: proposal.name,
    icon: proposal.icon,
    fields: proposal.fields,
    tagIds:
      missing !== null && index === 0
        ? [...proposal.tagIds, missing]
        : proposal.tagIds,
  }));
}

@Injectable()
export class SystemWorldsFlow {
  constructor(
    private readonly systemOptionsFlow: SystemOptionsFlow,
    private readonly structureProposalsFlow: StructureProposalsFlow,
    private readonly populationFlow: PopulationFlow,
    private readonly worldSources: WorldSources,
    private readonly systemDraftsService: SystemDraftsService,
  ) {}

  async run(
    userId: string,
    draftId: string,
    dto: SystemOptionsDto,
  ): Promise<SystemDraft> {
    const draft = await this.systemDraftsService.findOpen(userId, draftId);
    const pitches = await this.systemOptionsFlow.pitches(userId, dto);
    const results = await Promise.allSettled(
      pitches.map(async (pitch): Promise<DraftOption> => {
        const option = await pitch;
        const world = await this.worldOf(userId, draft, option).catch(
          () => null,
        );
        return { option, world };
      }),
    );
    const options = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );

    if (options.length === 0) {
      throw (results[0] as PromiseRejectedResult).reason;
    }

    return this.systemDraftsService.update(userId, draftId, { options });
  }

  private async worldOf(
    userId: string,
    draft: SystemDraft,
    option: SystemOption,
  ): Promise<DraftWorld> {
    const slot: DraftSlot = {
      system: { ...draft.system, description: option.theme },
      world: { structures: [], resources: [], hooks: [] },
      save: async () => undefined,
    };
    const source = await this.worldSources.ofSlot(draft, slot);
    const [proposals, structureTags] = await Promise.all([
      this.structureProposalsFlow.run(userId, source, {
        themes: option.themes,
        structures: option.structures.map((structure) => structure.name),
      }),
      source.structureTags(),
    ]);
    const actorsTagId = structureTags.find(
      (tag) => tag.journeyId === null && tag.slug === ACTORS_SLUG,
    )?.id;

    slot.world = {
      ...slot.world,
      structures: draftStructuresOf(proposals, actorsTagId),
    };

    const { hooks } = await this.populationFlow.run(userId, source, {});

    return { ...slot.world, hooks };
  }
}
