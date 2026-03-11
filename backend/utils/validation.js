const { z } = require('zod');

const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().min(0).max(3)
});

const QuizScoringSchema = z.object({
  mode: z.literal('time_weighted'),
  base_points: z.number()
});

const PuzzleScoringSchema = z.object({
  mode: z.literal('self_report'),
  points_per_correct: z.number()
});

const QuizActivitySchema = z.object({
  id: z.string(),
  type: z.literal('quiz'),
  step: z.number(),
  title: z.string(),
  timer_seconds: z.number().positive(),
  scoring: QuizScoringSchema,
  show_leaderboard_after_each: z.boolean(),
  questions: z.array(QuestionSchema).min(1)
});

const PuzzleActivitySchema = z.object({
  id: z.string(),
  type: z.literal('puzzle_assembly'),
  step: z.number(),
  title: z.string(),
  instruction: z.string(),
  timer_seconds: z.number().positive(),
  fragments_count: z.number().positive(),
  scoring: PuzzleScoringSchema
});

const ActivitySchema = z.union([QuizActivitySchema, PuzzleActivitySchema]);

const SessionTemplateSchema = z.object({
  session_template: z.object({
    name: z.string(),
    activities: z.array(ActivitySchema).min(1)
  })
});

module.exports = {
  SessionTemplateSchema,
  QuestionSchema,
  QuizActivitySchema,
  PuzzleActivitySchema,
  QuizScoringSchema,
  PuzzleScoringSchema
};
