import { Injectable } from '@nestjs/common';
import type { DraftOption } from '../../system-drafts/dto/system-draft.dto.js';
import { SystemDraftsService } from '../../system-drafts/system-drafts.service.js';
import type { CampaignOptionsDto } from '../dto/campaign-options.dto.js';
import { type CampaignOption, CampaignOptionsFlow } from './campaign-options.flow.js';

export function draftOptionsOf(
  results: readonly PromiseSettledResult<CampaignOption>[],
): DraftOption[] {
  const options = results.flatMap((result) =>
    result.status === 'fulfilled' ? [{ option: result.value, world: null }] : [],
  );

  if (options.length === 0) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  return options;
}

@Injectable()
export class SystemWorldsFlow {
  constructor(
    private readonly campaignOptionsFlow: CampaignOptionsFlow,
    private readonly systemDraftsService: SystemDraftsService,
  ) {}

  async run(
    userId: string,
    draftId: string,
    dto: CampaignOptionsDto,
    onOption: (option: CampaignOption) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.systemDraftsService.findOpen(userId, draftId);
    const pitches = await this.campaignOptionsFlow.pitches(userId, dto, signal);
    const settled: PromiseSettledResult<CampaignOption>[] = [];

    await Promise.all(
      pitches.map((pitch) =>
        pitch.then(
          (option) => {
            settled.push({ status: 'fulfilled', value: option });
            onOption(option);
          },
          (reason: unknown) => {
            settled.push({ status: 'rejected', reason });
          },
        ),
      ),
    );

    const options = draftOptionsOf(settled);

    signal?.throwIfAborted();

    await this.systemDraftsService.update(userId, draftId, { options });
  }
}
