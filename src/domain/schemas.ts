import { z } from 'zod';
import {
  goalCells,
  goalkeeperActions,
  halves,
  handednesses,
  shooterPositions,
  shotResults,
  shotTypes,
  shotZones,
  situations,
} from './enums';
import {
  isGoalCellAllowed,
  isGoalCellRequired,
  isGoalkeeperActionAllowed,
  MEMO_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from './validation';
import { YOUTUBE_VIDEO_ID_PATTERN } from './youtube';

/**
 * 保存データ・書き出しファイルのスキーマ（functional-design.md 6章）。
 * 型は types.ts で z.infer から導く。
 */

const idSchema = z.uuid();
const timestampSchema = z.iso.datetime();
const nameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);
const memoSchema = z.string().max(MEMO_MAX_LENGTH);

export const goalkeeperSchema = z.object({
  id: idSchema,
  name: nameSchema,
  teamName: nameSchema,
  number: z.int().min(0).max(999).optional(),
  handedness: z.enum(handednesses),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const matchSchema = z.object({
  id: idSchema,
  date: z.iso.date(),
  competition: z.string().trim().max(NAME_MAX_LENGTH).optional(),
  homeTeam: nameSchema,
  awayTeam: nameSchema,
  youtubeUrl: z.url().max(500),
  youtubeVideoId: z.string().regex(YOUTUBE_VIDEO_ID_PATTERN),
  memo: memoSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const matchGoalkeeperSchema = z.object({
  matchId: idSchema,
  goalkeeperId: idSchema,
});

const shotObjectSchema = z.object({
  id: idSchema,
  matchId: idSchema,
  goalkeeperId: idSchema,
  videoTime: z.number().min(0),
  half: z.literal(halves).optional(),
  gameMinute: z.int().min(0).max(120).optional(),
  zone: z.enum(shotZones),
  goalCell: z.literal(goalCells).optional(),
  shotType: z.enum(shotTypes).optional(),
  result: z.enum(shotResults),
  goalkeeperAction: z.enum(goalkeeperActions).optional(),
  shooterHand: z.enum(handednesses).optional(),
  shooterPosition: z.enum(shooterPositions).optional(),
  situation: z.enum(situations).optional(),
  memo: memoSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** 結果とコース・GKの対応の組み合わせが正しいこと（V2〜V5）も検証する */
export const shotSchema = shotObjectSchema.superRefine((shot, ctx) => {
  if (isGoalCellRequired(shot.result) && shot.goalCell === undefined) {
    ctx.addIssue({ code: 'custom', path: ['goalCell'], message: 'この結果ではコースが必須です' });
  }
  if (!isGoalCellAllowed(shot.result) && shot.goalCell !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['goalCell'], message: 'この結果ではコースを記録できません' });
  }
  if (!isGoalkeeperActionAllowed(shot.result) && shot.goalkeeperAction !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['goalkeeperAction'], message: 'GKの対応はセーブの場合のみ記録できます' });
  }
});

export const settingsSchema = z.object({
  highlightPreSeconds: z.number().min(0).max(30),
  highlightPostSeconds: z.number().min(0).max(30),
  autoResumeAfterRecord: z.boolean(),
  lowSampleThreshold: z.int().min(1).max(50),
  lastBackupAt: timestampSchema.nullable(),
});

/** 設定の既定値（functional-design.md 6.3） */
export const defaultSettings: z.infer<typeof settingsSchema> = {
  highlightPreSeconds: 4,
  highlightPostSeconds: 3,
  autoResumeAfterRecord: true,
  lowSampleThreshold: 3,
  lastBackupAt: null,
};

/** 書き出しファイルの形式のバージョン。構造を変えたら上げて、migrations.ts に移行処理を書く */
export const CURRENT_SCHEMA_VERSION = 1;
export const EXPORT_APP_NAME = 'handball_analysis';

export const exportScopes = ['all', 'goalkeeper', 'match'] as const;

export const exportFileSchema = z.object({
  app: z.literal(EXPORT_APP_NAME),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  exportedAt: timestampSchema,
  scope: z.enum(exportScopes),
  goalkeepers: z.array(goalkeeperSchema),
  matches: z.array(matchSchema),
  matchGoalkeepers: z.array(matchGoalkeeperSchema),
  shots: z.array(shotSchema),
  settings: settingsSchema.optional(),
});

/** 入力フォームから保存するときの形（id がなければ新規） */
export const goalkeeperInputSchema = goalkeeperSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ id: idSchema.optional() });

export const matchInputSchema = matchSchema
  .omit({ id: true, youtubeVideoId: true, createdAt: true, updatedAt: true })
  .extend({ id: idSchema.optional() });
