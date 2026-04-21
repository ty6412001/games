import { z } from 'zod';

import { DifficultySchema, QuestionIdSchema, SubjectSchema } from './question.js';

export const LearningGradeSchema = z.enum(['grade1']);
export type LearningGrade = z.infer<typeof LearningGradeSchema>;

export const LearningSemesterSchema = z.enum(['lower']);
export type LearningSemester = z.infer<typeof LearningSemesterSchema>;

export const LearningGameModeSchema = z.enum(['monopoly', 'review', 'practice', 'boss', 'wrong-book']);
export type LearningGameMode = z.infer<typeof LearningGameModeSchema>;

export const KnowledgeQuestionStatusSchema = z.enum(['draft', 'published', 'archived']);
export type KnowledgeQuestionStatus = z.infer<typeof KnowledgeQuestionStatusSchema>;

export const KnowledgeQuestionTypeSchema = z.enum([
  'choice',
  'input',
  'image-choice',
  'ordering',
]);
export type KnowledgeQuestionType = z.infer<typeof KnowledgeQuestionTypeSchema>;

export const KnowledgeQuestionMetadataSchema = z.object({
  source: z.string().min(1).max(100).default('manual'),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  textbookUnit: z.string().min(1).max(80).optional(),
  lessonKey: z.string().min(1).max(80).optional(),
  exportLabel: z.string().min(1).max(120).optional(),
});
export type KnowledgeQuestionMetadata = z.infer<typeof KnowledgeQuestionMetadataSchema>;

const knowledgeQuestionBaseShape = {
  id: QuestionIdSchema,
  subject: SubjectSchema,
  grade: LearningGradeSchema,
  semester: LearningSemesterSchema,
  difficulty: DifficultySchema,
  topic: z.string().min(1).max(120),
  stem: z.string().min(1).max(500),
  knowledgePoints: z.array(z.string().min(1).max(80)).min(1).max(8),
  gameModes: z.array(LearningGameModeSchema).min(1).max(5),
  explanation: z.string().min(1).max(500).optional(),
  status: KnowledgeQuestionStatusSchema,
  metadata: KnowledgeQuestionMetadataSchema,
  createdBy: z.string().min(1).max(80),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
};

export const KnowledgeChoiceQuestionItemSchema = z.object({
  ...knowledgeQuestionBaseShape,
  type: z.literal('choice'),
  options: z.array(z.string().min(1).max(120)).min(2).max(6),
  answer: z.string().min(1).max(120),
});

export const KnowledgeInputQuestionItemSchema = z.object({
  ...knowledgeQuestionBaseShape,
  type: z.literal('input'),
  answer: z.string().min(1).max(120),
});

export const KnowledgeImageChoiceQuestionItemSchema = z.object({
  ...knowledgeQuestionBaseShape,
  type: z.literal('image-choice'),
  options: z.array(z.string().min(1).max(120)).min(2).max(6),
  answer: z.string().min(1).max(120),
});

export const KnowledgeOrderingQuestionItemSchema = z.object({
  ...knowledgeQuestionBaseShape,
  type: z.literal('ordering'),
  items: z.array(z.string().min(1).max(120)).min(2).max(8),
  correctOrder: z.array(z.number().int().nonnegative()).min(2).max(8),
  answer: z.string().min(1).max(120),
});

export const KnowledgeQuestionItemSchema = z
  .discriminatedUnion('type', [
    KnowledgeChoiceQuestionItemSchema,
    KnowledgeInputQuestionItemSchema,
    KnowledgeImageChoiceQuestionItemSchema,
    KnowledgeOrderingQuestionItemSchema,
  ])
  .superRefine((item, ctx) => {
    if (item.type === 'choice' || item.type === 'image-choice') {
      if (!item.options.includes(item.answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['answer'],
          message: 'answer must appear in options',
        });
      }
    }
    if (item.type === 'ordering') {
      if (item.correctOrder.length !== item.items.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctOrder'],
          message: 'correctOrder length must match items length',
        });
      }
      const unique = new Set(item.correctOrder);
      if (unique.size !== item.correctOrder.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctOrder'],
          message: 'correctOrder must contain unique indices',
        });
      }
      for (const index of item.correctOrder) {
        if (index >= item.items.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['correctOrder'],
            message: `correctOrder index ${index} out of range`,
          });
          break;
        }
      }
    }
  });
export type KnowledgeQuestionItem = z.infer<typeof KnowledgeQuestionItemSchema>;

export const KnowledgeQuestionCreateSchema = z.object({
  id: QuestionIdSchema.optional(),
  subject: SubjectSchema,
  grade: LearningGradeSchema.default('grade1'),
  semester: LearningSemesterSchema.default('lower'),
  difficulty: DifficultySchema,
  topic: z.string().min(1).max(120),
  stem: z.string().min(1).max(500),
  type: KnowledgeQuestionTypeSchema,
  options: z.array(z.string().min(1).max(120)).min(2).max(6).optional(),
  items: z.array(z.string().min(1).max(120)).min(2).max(8).optional(),
  correctOrder: z.array(z.number().int().nonnegative()).min(2).max(8).optional(),
  answer: z.string().min(1).max(120),
  knowledgePoints: z.array(z.string().min(1).max(80)).min(1).max(8),
  gameModes: z.array(LearningGameModeSchema).min(1).max(5),
  explanation: z.string().min(1).max(500).optional(),
  status: KnowledgeQuestionStatusSchema.default('draft'),
  metadata: KnowledgeQuestionMetadataSchema.default({ source: 'manual', tags: [] }),
});
export type KnowledgeQuestionCreateInput = z.infer<typeof KnowledgeQuestionCreateSchema>;

export const KnowledgeQuestionUpdateSchema = KnowledgeQuestionCreateSchema.partial().extend({
  id: z.never().optional(),
});
export type KnowledgeQuestionUpdateInput = z.infer<typeof KnowledgeQuestionUpdateSchema>;

export const KnowledgeAnswerOutcomeSchema = z.enum(['correct', 'wrong', 'timeout', 'skipped']);
export type KnowledgeAnswerOutcome = z.infer<typeof KnowledgeAnswerOutcomeSchema>;

export const KnowledgeAnswerLogSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  questionId: QuestionIdSchema,
  subject: SubjectSchema,
  grade: LearningGradeSchema,
  semester: LearningSemesterSchema,
  gameMode: LearningGameModeSchema,
  outcome: KnowledgeAnswerOutcomeSchema,
  questionStem: z.string().min(1).max(500),
  submittedAnswer: z.string().max(200),
  correctAnswer: z.string().min(1).max(120),
  durationMs: z.number().int().nonnegative().optional(),
  sourceSessionId: z.string().min(1).max(120).optional(),
  answeredAt: z.number().int().nonnegative(),
});
export type KnowledgeAnswerLog = z.infer<typeof KnowledgeAnswerLogSchema>;

export const KnowledgeAnswerLogCreateSchema = KnowledgeAnswerLogSchema.omit({
  id: true,
  grade: true,
  semester: true,
}).extend({
  grade: LearningGradeSchema.default('grade1'),
  semester: LearningSemesterSchema.default('lower'),
});
export type KnowledgeAnswerLogCreateInput = z.infer<typeof KnowledgeAnswerLogCreateSchema>;

export const KnowledgeMasteryRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  questionId: QuestionIdSchema,
  subject: SubjectSchema,
  grade: LearningGradeSchema,
  semester: LearningSemesterSchema,
  gameModes: z.array(LearningGameModeSchema).min(1).max(5),
  masteryScore: z.number().int().min(0).max(100),
  totalAttempts: z.number().int().nonnegative(),
  correctAttempts: z.number().int().nonnegative(),
  wrongAttempts: z.number().int().nonnegative(),
  lastAnsweredAt: z.number().int().nonnegative().optional(),
  masteredAt: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative(),
});
export type KnowledgeMasteryRecord = z.infer<typeof KnowledgeMasteryRecordSchema>;

export const LearningRewardEventSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  questionId: QuestionIdSchema.optional(),
  gameMode: LearningGameModeSchema,
  eventType: z.enum(['coins', 'material', 'weapon', 'exp', 'unlock']),
  amount: z.number().int().nonnegative(),
  payload: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.number().int().nonnegative(),
});
export type LearningRewardEvent = z.infer<typeof LearningRewardEventSchema>;

export const KnowledgeWrongBookRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  questionId: QuestionIdSchema,
  subject: SubjectSchema,
  grade: LearningGradeSchema,
  semester: LearningSemesterSchema,
  questionStem: z.string().min(1).max(500),
  wrongAnswer: z.string().max(200),
  correctAnswer: z.string().min(1).max(120),
  firstWrongAt: z.number().int().nonnegative(),
  lastWrongAt: z.number().int().nonnegative(),
  wrongCount: z.number().int().positive(),
  isMastered: z.boolean(),
  masteredAt: z.number().int().nonnegative().optional(),
  sourceMode: LearningGameModeSchema,
});
export type KnowledgeWrongBookRecord = z.infer<typeof KnowledgeWrongBookRecordSchema>;

export const KnowledgeExportMetadataSchema = z.object({
  exportId: z.string().min(1),
  exportedAt: z.number().int().nonnegative(),
  exportScope: z.enum(['questions', 'progress', 'full']),
  format: z.literal('json'),
  grade: LearningGradeSchema,
  semester: LearningSemesterSchema,
  questionCount: z.number().int().nonnegative(),
  answerLogCount: z.number().int().nonnegative(),
  wrongBookCount: z.number().int().nonnegative(),
  masteryRecordCount: z.number().int().nonnegative(),
  rewardEventCount: z.number().int().nonnegative(),
});
export type KnowledgeExportMetadata = z.infer<typeof KnowledgeExportMetadataSchema>;

export const KnowledgeExportBundleSchema = z.object({
  metadata: KnowledgeExportMetadataSchema,
  questions: z.array(KnowledgeQuestionItemSchema),
  answerLogs: z.array(KnowledgeAnswerLogSchema),
  wrongBookRecords: z.array(KnowledgeWrongBookRecordSchema),
  masteryRecords: z.array(KnowledgeMasteryRecordSchema),
  rewardEvents: z.array(LearningRewardEventSchema),
});
export type KnowledgeExportBundle = z.infer<typeof KnowledgeExportBundleSchema>;
