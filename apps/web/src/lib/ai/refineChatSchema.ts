import { z } from 'zod';
import { refinementPatchSchema } from './refineSchema';

/**
 * Resposta do assistant no chat de refinamento.
 *
 * `message`  — texto conversacional que sempre aparece na timeline.
 * `patch`    — opcional: quando a IA tem TUDO claro, gera o patch pra o
 *              consultor confirmar e aplicar. Quando precisa esclarecer
 *              algo, retorna patch=null e usa `message` pra perguntar.
 *
 * Strict-mode: ambos os campos sempre presentes (patch=null quando
 * for o caso).
 */
export const refineChatReplySchema = z.object({
  message: z
    .string()
    .describe(
      'Resposta conversacional pro consultor. Pode ser pergunta de esclarecimento OU resumo do que vai mudar.',
    ),
  patch: refinementPatchSchema
    .nullable()
    .describe(
      'Patch a aplicar. Use null quando precisar de mais informação antes de aplicar mudanças.',
    ),
});

export type RefineChatReply = z.infer<typeof refineChatReplySchema>;
