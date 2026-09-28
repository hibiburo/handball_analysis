import type { Goalkeeper, Match, MatchGoalkeeper, Shot } from '@/domain/types';

/**
 * テストデータのファクトリー（development-guidelines.md 5.2）。
 * テストに関係する項目だけを引数で指定し、残りは妥当な既定値にする。
 */

const FIXED_TIMESTAMP = '2026-09-28T00:00:00.000Z';
let sequence = 0;

/** 連番から UUID 形式の ID を作る（テスト結果を安定させるため乱数を使わない） */
export function testId(): string {
  sequence++;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

export function buildGoalkeeper(overrides: Partial<Goalkeeper> = {}): Goalkeeper {
  return {
    id: testId(),
    name: '山田 太郎',
    teamName: '○○大学',
    number: 1,
    handedness: 'right',
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}

export function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: testId(),
    date: '2026-09-20',
    competition: '秋季リーグ',
    homeTeam: '○○大学',
    awayTeam: '□□大学',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeVideoId: 'dQw4w9WgXcQ',
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}

export function buildMatchGoalkeeper(match: Pick<Match, 'id'>, goalkeeper: Pick<Goalkeeper, 'id'>): MatchGoalkeeper {
  return { matchId: match.id, goalkeeperId: goalkeeper.id };
}

/** 既定は「レフトバックからコース1への失点」 */
export function buildShot(overrides: Partial<Shot> = {}): Shot {
  const result = overrides.result ?? 'goal';
  const base: Shot = {
    id: testId(),
    matchId: overrides.matchId ?? testId(),
    goalkeeperId: overrides.goalkeeperId ?? testId(),
    videoTime: 60,
    zone: 'lb',
    result,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  };
  // 失点・セーブはコースが必須（V2）
  if (result === 'goal' || result === 'save') base.goalCell = 1;
  return { ...base, ...overrides };
}
