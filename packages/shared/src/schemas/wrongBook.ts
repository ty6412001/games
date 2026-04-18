import { z } from 'zod';

import { QuestionIdSchema, SubjectSchema } from './question.js';

export const WrongBookEntryIdSchema = z.string().min(1);
export type WrongBookEntryId = z.infer<typeof WrongBookEntryIdSchema>;

export const WrongBookEntrySchema = z.object({
  id: WrongBookEntryIdSchema,
  childId: z.string().min(1),
  questionId: QuestionIdSchema,
  subject: SubjectSchema,
  week: z.number().int().min(1).max(18),
  stem: z.string().min(1),
  wrongAnswer: z.string(),
  correctAnswer: z.string().min(1),
  firstWrongAt: z.number().int().nonnegative(),
  lastWrongAt: z.number().int().nonnegative(),
  wrongCount: z.number().int().positive(),
  isMastered: z.boolean(),
  masteredAt: z.number().int().nonnegative().optional(),
});
export type WrongBookEntry = z.infer<typeof WrongBookEntrySchema>;
