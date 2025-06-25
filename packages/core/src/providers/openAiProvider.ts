/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MalformedToolCallError } from '../utils/errors.js';
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
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { getEncoding } from 'js-tiktoken';

function toOpenAiRole(
  role: string,
): 'user' | 'assistant' | 'system' | 'tool' {
  switch (role) {
    case 'user':
      return 'user';
    case 'model':
      return 'assistant';
    case 'system':
      return 'system';
    case 'tool':
      return 'tool';
    default:
      return 'user';
  }
}

function toOpenAiContent(
  parts: Part[],
): string | (string | OpenAI.Chat.Completions.ChatCompletionContentPart)[] {
  const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  for (const part of parts) {
    if (part.text) {
      contentParts.push({ type: 'text', text: part.text });
    } else if (part.inlineData) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        },
      });
    }
  }
  return contentParts;
}

export class OpenAIProvider implements LlmProvider {
  private openai: OpenAI;
  private tiktoken = getEncoding('cl100k_base');

  constructor(private config: Config) {
    const providerConfig = this.config.getProviderConfig('openai');
    this.openai = new OpenAI({
      apiKey: providerConfig?.apiKey,
      baseURL: providerConfig?.baseUrl,
    });
  }

  async generateContent(
    request: GenerateContentRequest,
  ): Promise<GenerateContentResult> {
    const messages: ChatCompletionMessageParam[] = request.contents.map(
      (content) => {
        return {
          role: toOpenAiRole(content.role),
          content: toOpenAiContent(content.parts),
        };
      },
    );

    const tools: ChatCompletionTool[] | undefined = request.tools?.map(
      (tool) => {
        return {
          type: 'function',
          function: {
            name: tool.functionDeclarations?.[0].name || '',
            description: tool.functionDeclarations?.[0].description,
            parameters: tool.functionDeclarations?.[0].parameters,
          },
        };
      },
    );

    const response = await this.openai.chat.completions.create({
      model: request.generationConfig?.model || 'gpt-3.5-turbo',
      messages,
      tools,
    });

    const responseContent = response.choices[0].message.content || '';
    const toolCalls = response.choices[0].message.tool_calls?.map((toolCall) => {
      try {
        return {
          functionCall: {
            name: toolCall.function.name,
            args: JSON.parse(toolCall.function.arguments),
          },
        };
      } catch (e) {
        throw new MalformedToolCallError(
          `Failed to parse tool arguments for tool ${toolCall.function.name}: ${e.message}`,
        );
      }
    });

    return {
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: responseContent, toolCalls }],
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
    const text = request.contents
      .map((content) =>
        content.parts.map((part) => part.text || '').join(''),
      )
      .join('');
    const totalTokens = this.tiktoken.encode(text).length;
    return { totalTokens };
  }

  async embedContent(
    request: EmbedContentRequest,
  ): Promise<EmbedContentResponse> {
    const text = request.content.parts.map((part) => part.text).join('');
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return {
      embedding: {
        value: response.data[0].embedding,
      },
    };
  }
}
