import { describe, expect, it } from 'vitest';

import { createAnswerLog } from '../apiClient';

describe('apiClient test runtime behavior', () => {
  it('disables cloud writes during vitest when no api base is configured', async () => {
    await expect(
      createAnswerLog({
        learnerId: 'child-1',
        questionId: 'q-1',
        subject: 'math',
        grade: 'grade1',
        semester: 'lower',
        gameMode: 'practice',
        outcome: 'correct',
        questionStem: '1+1=?',
        submittedAnswer: '2',
        correctAnswer: '2',
        answeredAt: 1,
      }),
    ).rejects.toMatchObject({ code: 'API_DISABLED' });
  });
});
