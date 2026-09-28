import type { z } from 'zod';
import type {
  exportFileSchema,
  exportScopes,
  goalkeeperInputSchema,
  goalkeeperSchema,
  matchGoalkeeperSchema,
  matchInputSchema,
  matchSchema,
  settingsSchema,
  shotSchema,
} from './schemas';

export type Goalkeeper = z.infer<typeof goalkeeperSchema>;
export type Match = z.infer<typeof matchSchema>;
export type MatchGoalkeeper = z.infer<typeof matchGoalkeeperSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type ExportFile = z.infer<typeof exportFileSchema>;
export type ExportScope = (typeof exportScopes)[number];

export type GoalkeeperInput = z.infer<typeof goalkeeperInputSchema>;
export type MatchInput = z.infer<typeof matchInputSchema>;

/** 保存するシュート（id がなければ新規。日時は Repository が付与する） */
export type ShotInput = Omit<Shot, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

/** 入力フォームで編集中のシュート。試合以外はすべて未入力の可能性がある */
export type ShotDraft = Partial<Omit<ShotInput, 'matchId'>> & { matchId: string };
