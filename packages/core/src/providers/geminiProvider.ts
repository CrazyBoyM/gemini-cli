/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensRequest,
  CountTokensResponse,
  EmbedContentRequest,
  EmbedContentResponse,
  GenerateContentRequest,
  GenerateContentResult,
  GenerativeModel,
} from '@google/generative-ai';
import { LlmProvider } from '../core/llmProvider';
import { Config } from '../config/config';
import { createContentGenerator } from '../core/contentGenerator';

export class GeminiProvider implements LlmProvider {
  private model: GenerativeModel;

  constructor(private config: Config) {
    const contentGenerator = createContentGenerator(
      this.config.getContentGeneratorConfig(),
    );
    this.model = contentGenerator;
  }

  async generateContent(
    request: GenerateContentRequest,
  ): Promise<GenerateContentResult> {
    const result = await this.model.generateContent(request);
    return result;
  }

  async countTokens(
    request: CountTokensRequest,
  ): Promise<CountTokensResponse> {
    const result = await this.model.countTokens(request);
    return result;
  }

  async embedContent(
    request: EmbedContentRequest,
  ): Promise<EmbedContentResponse> {
    const result = await this.model.embedContent(request);
    return result;
  }
}
