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
import ollama from 'ollama';
import { Message } from 'ollama';

function toOllamaRole(role: string): 'user' | 'assistant' | 'system' {
  switch (role) {
    case 'user':
      return 'user';
    case 'model':
      return 'assistant';
    case 'system':
      return 'system';
    default:
      return 'user';
  }
}

function toOllamaContent(parts: Part[]): string {
  return parts.map((part) => part.text).join('');
}

export class OllamaProvider implements LlmProvider {
  constructor(private config: Config) {
    ollama.host =
      this.config.getProviderConfig('ollama')?.baseUrl || 'http://localhost:11434';
  }

  async generateContent(
    request: GenerateContentRequest,
  ): Promise<GenerateContentResult> {
    const messages: Message[] = request.contents.map((content) => {
      return {
        role: toOllamaRole(content.role),
        content: toOllamaContent(content.parts),
      };
    });

    const response = await ollama.chat({
      model: this.config.getProviderConfig('ollama')?.model || 'llama3',
      messages,
    });

    const responseContent = response.message.content;

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
    // Ollama does not provide a token counting API.
    throw new Error('Token counting is not supported for Ollama models.');
  }

  async embedContent(
    request: EmbedContentRequest,
  ): Promise<EmbedContentResponse> {
    const text = request.content.parts.map((part) => part.text).join('');
    const response = await ollama.embeddings({
      model: this.config.getProviderConfig('ollama')?.model || 'llama3',
      prompt: text,
    });

    return {
      embedding: {
        value: response.embedding,
      },
    };
  }
}
