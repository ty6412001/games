import { z } from 'zod';

export const SubjectSchema = z.enum(['math', 'chinese', 'english']);
export type Subject = z.infer<typeof SubjectSchema>;

export const DifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuestionIdSchema = z.string().min(1);
export type QuestionId = z.infer<typeof QuestionIdSchema>;

export const QuestionRewardSchema = z.object({
  correct: z.number().int(),
  wrong: z.number().int(),
});
export type QuestionReward = z.infer<typeof QuestionRewardSchema>;

const questionBaseShape = {
  id: QuestionIdSchema,
  subject: SubjectSchema,
  difficulty: DifficultySchema,
  topic: z.string().min(1),
  stem: z.string().min(1),
  stemImage: z.string().optional(),
  reward: QuestionRewardSchema.optional(),
};

export const ChoiceQuestionSchema = z.object({
  ...questionBaseShape,
  type: z.literal('choice'),
  options: z.array(z.string().min(1)).min(2).max(5),
  answer: z.string().min(1),
});

export const InputQuestionSchema = z.object({
  ...questionBaseShape,
  type: z.literal('input'),
  answer: z.string().min(1),
});

export const ImageChoiceQuestionSchema = z.object({
  ...questionBaseShape,
  type: z.literal('image-choice'),
  options: z.array(z.string().min(1)).min(2).max(5),
  answer: z.string().min(1),
});

export const OrderingQuestionSchema = z.object({
  ...questionBaseShape,
  type: z.literal('ordering'),
  items: z.array(z.string().min(1)).min(2).max(8),
  correctOrder: z.array(z.number().int().nonnegative()).min(2).max(8),
  answer: z.string().min(1),
});

export const QuestionSchema = z
  .discriminatedUnion('type', [
    ChoiceQuestionSchema,
    InputQuestionSchema,
    ImageChoiceQuestionSchema,
    OrderingQuestionSchema,
  ])
  .superRefine((q, ctx) => {
    if (q.type === 'choice' || q.type === 'image-choice') {
      if (!q.options.includes(q.answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'answer must appear in options',
          path: ['answer'],
        });
      }
    }
    if (q.type === 'ordering') {
      if (q.correctOrder.length !== q.items.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'correctOrder length must match items length',
          path: ['correctOrder'],
        });
      }
      const unique = new Set(q.correctOrder);
      if (unique.size !== q.correctOrder.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'correctOrder must contain unique indices',
          path: ['correctOrder'],
        });
      }
      for (const idx of q.correctOrder) {
        if (idx >= q.items.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `correctOrder index ${idx} out of range`,
            path: ['correctOrder'],
          });
          break;
        }
      }
    }
  });
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionPackBossSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hp: z.number().int().positive(),
  image: z.string().optional(),
});
export type QuestionPackBoss = z.infer<typeof QuestionPackBossSchema>;

export const QuestionPackSchema = z.object({
  week: z.number().int().min(1).max(18),
  title: z.string().min(1),
  boss: QuestionPackBossSchema,
  questions: z.array(QuestionSchema).min(1),
});
export type QuestionPack = z.infer<typeof QuestionPackSchema>;

export const QuestionPackIndexEntrySchema = z.object({
  week: z.number().int().min(1).max(18),
  title: z.string().min(1),
  path: z.string().min(1),
});
export type QuestionPackIndexEntry = z.infer<typeof QuestionPackIndexEntrySchema>;

export const QuestionPackIndexSchema = z.object({
  packs: z.array(QuestionPackIndexEntrySchema),
});
export type QuestionPackIndex = z.infer<typeof QuestionPackIndexSchema>;
