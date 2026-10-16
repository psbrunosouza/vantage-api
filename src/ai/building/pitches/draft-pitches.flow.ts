import { Injectable } from '@nestjs/common';
import type { DraftOption } from '../../../onboarding/system-drafts/dto/system-draft.dto.js';
import { SystemDraftsService } from '../../../onboarding/system-drafts/system-drafts.service.js';
import type { Locale } from '../../../core/auth/locales.js';
import type { CampaignOptionsDto } from './campaign-options.dto.js';
import { type CampaignOption, PitchesFlow } from './pitches.flow.js';

export function draftOptionsOf(
  results: readonly PromiseSettledResult<CampaignOption>[],
): DraftOption[] {
  const options = results.flatMap((result) =>
    result.status === 'fulfilled'
      ? [{ option: result.value, world: null }]
      : [],
  );

  if (options.length === 0) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  return options;
}

@Injectable()
export class DraftPitchesFlow {
  constructor(
    private readonly pitchesFlow: PitchesFlow,
    private readonly systemDraftsService: SystemDraftsService,
  ) {}

  async run(
    userId: string,
    draftId: string,
    dto: CampaignOptionsDto,
    locale: Locale,
    onOption: (option: CampaignOption) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.systemDraftsService.findOpen(userId, draftId);
    const pitches = await this.pitchesFlow.pitches(userId, dto, locale, signal);
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
