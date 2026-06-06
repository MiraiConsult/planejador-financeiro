import { z } from 'zod';

export const dreamCategoryEnum = z.enum([
  'casa',
  'viagem',
  'faculdade',
  'casamento',
  'carro',
  'heranca',
  'outros',
]);

export type DreamCategory = z.infer<typeof dreamCategoryEnum>;

export const extractedDreamSchema = z.object({
  categoria: dreamCategoryEnum,
  descricao: z.string().min(1).max(80),
  valor: z.number(),
  idade_alvo: z.number().int().min(18).max(120),
  justificativa: z.string().min(1).max(200),
});

export type ExtractedDream = z.infer<typeof extractedDreamSchema>;

export const dreamExtractionResultSchema = z.object({
  sonhos: z.array(extractedDreamSchema),
  resumo: z
    .string()
    .describe('1-2 frases resumindo o que o cliente parece valorizar no fundo'),
});

export type DreamExtractionResult = z.infer<typeof dreamExtractionResultSchema>;
