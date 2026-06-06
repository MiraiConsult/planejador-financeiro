# Módulo AI

Provider abstraction pra LLM. Suporta OpenAI e Google Gemini via [Vercel AI SDK](https://sdk.vercel.ai).

## Setup no Vercel

### Opção 1: OpenAI (default)

```
OPENAI_API_KEY=sk-...
```

Modelo default: `gpt-4o-mini` (rápido, ~$0.15/1M tokens input). Override:
```
AI_MODEL=gpt-4o
```

### Opção 2: Gemini

```
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

Modelo default: `gemini-2.0-flash`. Override:
```
AI_MODEL=gemini-2.0-pro
```

## Endpoints

- `POST /api/onboarding/chat` — streaming chat conversacional. Body: `{ messages, context }`.
- `POST /api/onboarding/extract-dreams` — extração estruturada da conversa. Body: `{ messages }`. Retorna `{ sonhos: [...], resumo }`.
- `GET /api/onboarding/status` — `{ configured, provider }` pra UI saber se mostra chat ou fallback.

## Custo aproximado por onboarding

- ~20 turnos de conversa + extração ≈ 5k tokens input + 2k output
- gpt-4o-mini: ~$0.001 por cliente
- gemini-2.0-flash: equivalente

## Fallback

Se nenhuma chave estiver configurada, `isAIConfigured()` retorna `false`. A UI do passo Sonhos detecta isso e mostra o modo manual (gráficos de arrastar) direto.
