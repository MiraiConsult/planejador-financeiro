/**
 * Provider abstraction para LLM. Escolhe OpenAI ou Gemini baseado em
 * env vars. Plug-and-play: basta configurar OPENAI_API_KEY ou
 * GEMINI_API_KEY no Vercel.
 *
 * Seleção:
 *   AI_PROVIDER=openai (default) → usa @ai-sdk/openai
 *   AI_PROVIDER=gemini           → usa @ai-sdk/google
 *
 * Modelo default:
 *   openai → gpt-4o-mini (rápido, barato, ótimo pra chat conversacional)
 *   gemini → gemini-2.0-flash (similar)
 *
 * Override via AI_MODEL.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type AIProvider = 'openai' | 'gemini';

export function isAIConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER ?? 'openai') as AIProvider;
  if (provider === 'openai') return !!process.env.OPENAI_API_KEY;
  if (provider === 'gemini') return !!process.env.GEMINI_API_KEY;
  return false;
}

export function getAIModel(): LanguageModel {
  const provider = (process.env.AI_PROVIDER ?? 'openai') as AIProvider;

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }
    const google = createGoogleGenerativeAI({ apiKey });
    const modelName = process.env.AI_MODEL ?? 'gemini-2.0-flash';
    return google(modelName);
  }

  // default: openai
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada');
  }
  const openai = createOpenAI({ apiKey });
  const modelName = process.env.AI_MODEL ?? 'gpt-4o-mini';
  return openai(modelName);
}

export function getProviderName(): string {
  const provider = (process.env.AI_PROVIDER ?? 'openai') as AIProvider;
  return provider === 'gemini' ? 'Google Gemini' : 'OpenAI';
}
