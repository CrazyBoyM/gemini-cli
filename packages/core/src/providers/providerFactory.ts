/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { LlmProvider } from '../core/llmProvider';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openAiProvider';
import { ClaudeProvider } from './claudeProvider';
import { OllamaProvider } from './ollamaProvider';
import { Config } from '../config/config';

export function providerFactory(config: Config): LlmProvider {
  const provider = config.getProvider();
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'claude':
      return new ClaudeProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'gemini':
    default:
      return new GeminiProvider(config);
  }
}
