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
  Part,
} from '@google/generative-ai';
import { LlmProvider } from '../core/llmProvider';
import { Config } from '../config/config';
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';

function toClaudeRole(role: string): 'user' | 'assistant' {
  switch (role) {
    case 'user':
      return 'user';
    case 'model':
      return 'assistant';
    default:
      return 'user';
  }
}

function toClaudeContent(parts: Part[]): string {
  if (parts.some((part) => part.inlineData)) {
    throw new Error('The Claude provider does not support image input.');
  }
  return parts.map((part) => part.text).join('');
}

export class ClaudeProvider implements LlmProvider {
  private anthropic: Anthropic;

  constructor(private config: Config) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getProviderConfig('claude')?.apiKey,
    });
  }

  async generateContent(
    request: GenerateContentRequest,
  ): Promise<GenerateContentResult> {
    const messages: MessageParam[] = request.contents.map((content) => {
      return {
        role: toClaudeRole(content.role),
        content: toClaudeContent(content.parts),
      };
    });

    const response = await this.anthropic.messages.create({
      model:
        this.config.getProviderConfig('claude')?.model ||
        'claude-3-opus-20240229',
      max_tokens: 4096,
      messages,
    });

    const responseContent = response.content[0].text;

    return {
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: responseContent }],
              role: 'model',
            },
          },
        ],
      },
    };
  }

  async countTokens(
    request: CountTokensRequest,
  ): Promise<CountTokensResponse> {
    // Anthropic does not provide a token counting API.
    // We can either use a library like `tokenizers` or just throw an error.
    // For now, we'll throw an error.
    throw new Error('Token counting is not supported for Claude models.');
  }

  async embedContent(
    request: EmbedContentRequest,
  ): Promise<EmbedContentResponse> {
    // Anthropic does not provide an embedding API.
    throw new Error('Embedding is not supported for Claude models.');
  }
}
