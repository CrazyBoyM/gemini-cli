import {
  CountTokensRequest,
  CountTokensResponse,
  EmbedContentRequest,
  EmbedContentResponse,
  GenerateContentRequest,
  GenerateContentResult,
} from '@google/generative-ai';

/**
 * Defines the standard interface for a Large Language Model (LLM) provider.
 * All provider implementations (e.g., Gemini, OpenAI, Claude) must adhere to this contract.
 * It uses the Google Generative AI types as the canonical data structure to minimize
 * changes across the existing system.
 */
export interface LlmProvider {
  /**
   * Sends a content generation request to the LLM provider.
   *
   * @param request The content generation request, conforming to the Gemini API's structure.
   * @returns A promise that resolves with the content generation result, also conforming
   *          to the Gemini API's structure.
   */
  generateContent(
    request: GenerateContentRequest,
  ): Promise<GenerateContentResult>;

  /**
   * Counts the number of tokens in a given request.
   * @param request The request to count tokens for.
   * @returns A promise that resolves with the token count.
   */
  countTokens(request: CountTokensRequest): Promise<CountTokensResponse>;

  /**
   * Generates an embedding for a given request.
   * @param request The request to generate an embedding for.
   * @returns A promise that resolves with the embedding.
   */
  embedContent(request: EmbedContentRequest): Promise<EmbedContentResponse>;
}
