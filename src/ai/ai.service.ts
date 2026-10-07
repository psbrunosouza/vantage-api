import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE } from '../database/database.module.js';
import { AiKeyCipher } from './ai-key.cipher.js';
import { type AiSettings, aiSettings } from './ai.schema.js';
import type { UpdateAiSettingsDto } from './dto/update-ai-settings.dto.js';
import { type AiModel, OpenRouterClient } from './openrouter.client.js';

const MODELS_TTL_MS = 60 * 60 * 1000;
const KEY_HINT_LENGTH = 4;

export interface AiSettingsView {
  model: string | null;
  hasKey: boolean;
  keyHint: string | null;
}

export interface AiCredentials {
  model: string;
  apiKey: string;
}

@Injectable()
export class AiService {
  private models: { list: AiModel[]; expiresAt: number } | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: NodePgDatabase,
    private readonly openRouter: OpenRouterClient,
    private readonly cipher: AiKeyCipher,
  ) {}

  async listModels(): Promise<AiModel[]> {
    if (this.models && this.models.expiresAt > Date.now()) {
      return this.models.list;
    }

    const list = await this.openRouter.listToolModels();
    this.models = { list, expiresAt: Date.now() + MODELS_TTL_MS };
    return list;
  }

  async findSettings(userId: string): Promise<AiSettingsView> {
    return this.toView(await this.settingsOf(userId));
  }

  async updateSettings(
    userId: string,
    dto: UpdateAiSettingsDto,
  ): Promise<AiSettingsView> {
    if (dto.model !== undefined) {
      await this.ensureToolModel(dto.model);
    }

    const changes = {
      model: dto.model,
      ...(dto.apiKey === undefined ? {} : await this.sealKey(dto.apiKey)),
    };

    const [settings] = await this.db
      .insert(aiSettings)
      .values({ userId, ...changes })
      .onConflictDoUpdate({
        target: aiSettings.userId,
        set: { ...changes, updatedAt: new Date() },
      })
      .returning();

    return this.toView(settings);
  }

  async removeKey(userId: string): Promise<void> {
    await this.db
      .update(aiSettings)
      .set({ apiKey: null, apiKeyHint: null })
      .where(eq(aiSettings.userId, userId));
  }

  async credentialsOf(userId: string): Promise<AiCredentials> {
    const settings = await this.settingsOf(userId);

    if (!settings?.model || !settings.apiKey) {
      throw new BadRequestException({
        code: 'AI_NOT_CONFIGURED',
        message: 'Choose a model and add an OpenRouter key first.',
      });
    }

    return {
      model: settings.model,
      apiKey: this.cipher.decrypt(settings.apiKey),
    };
  }

  private async settingsOf(userId: string): Promise<AiSettings | undefined> {
    const [settings] = await this.db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.userId, userId));
    return settings;
  }

  private async ensureToolModel(model: string): Promise<void> {
    const models = await this.listModels();

    if (!models.some((candidate) => candidate.id === model)) {
      throw new BadRequestException({
        code: 'AI_MODEL_UNAVAILABLE',
        message: "This model isn't available or doesn't support tools.",
      });
    }
  }

  private async sealKey(
    apiKey: string,
  ): Promise<Pick<AiSettings, 'apiKey' | 'apiKeyHint'>> {
    if (!(await this.openRouter.isValidKey(apiKey))) {
      throw new BadRequestException({
        code: 'AI_KEY_INVALID',
        message: 'This OpenRouter key is invalid.',
      });
    }

    return {
      apiKey: this.cipher.encrypt(apiKey),
      apiKeyHint: apiKey.slice(-KEY_HINT_LENGTH),
    };
  }

  private toView(settings: AiSettings | undefined): AiSettingsView {
    return {
      model: settings?.model ?? null,
      hasKey: Boolean(settings?.apiKey),
      keyHint: settings?.apiKeyHint ?? null,
    };
  }
}
