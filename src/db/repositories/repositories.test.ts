import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { AppDatabase } from '@/db/database';
import type { Goalkeeper, Match, ShotInput } from '@/domain/types';
import { createTestDatabase } from '@/test/db';
import { goalkeeperRepository } from './goalkeeperRepository';
import { matchRepository } from './matchRepository';
import { settingsRepository } from './settingsRepository';
import { shotRepository } from './shotRepository';

let db: AppDatabase;
let goalkeepers: ReturnType<typeof goalkeeperRepository>;
let matches: ReturnType<typeof matchRepository>;
let shots: ReturnType<typeof shotRepository>;
let settings: ReturnType<typeof settingsRepository>;

beforeEach(() => {
  db = createTestDatabase();
  goalkeepers = goalkeeperRepository(db);
  matches = matchRepository(db);
  shots = shotRepository(db);
  settings = settingsRepository(db);
});

afterEach(async () => {
  await db.delete();
});

const URL_A = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function createGoalkeeper(name = '山田', teamName = '○○大学'): Promise<Goalkeeper> {
  return goalkeepers.save({ name, teamName, handedness: 'right' });
}

async function createMatch(goalkeeperIds: string[], date = '2026-09-20'): Promise<Match> {
  const result = await matches.save({ date, homeTeam: '○○大学', awayTeam: '□□大学', youtubeUrl: URL_A }, goalkeeperIds);
  if (!result.ok) throw new Error(`試合の保存に失敗: ${result.error.code}`);
  return result.value;
}

function shotInput(match: Match, goalkeeper: Goalkeeper, overrides: Partial<ShotInput> = {}): ShotInput {
  return { matchId: match.id, goalkeeperId: goalkeeper.id, videoTime: 60, zone: 'lb', result: 'goal', goalCell: 1, ...overrides };
}

describe('goalkeeperRepository', () => {
  it('新規登録で ID と登録日時を付け、更新では登録日時を保ったまま更新日時を変える', async () => {
    const created = await createGoalkeeper();
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBe(created.updatedAt);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await goalkeepers.save({ ...created, name: '山田 太郎' });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    expect(await goalkeepers.get(created.id)).toMatchObject({ name: '山田 太郎' });
  });

  it('不正な入力は保存せずに ZodError を投げる', async () => {
    await expect(goalkeepers.save({ name: '', teamName: '○○大学', handedness: 'right' })).rejects.toBeInstanceOf(ZodError);
    expect(await goalkeepers.list()).toEqual([]);
  });

  it('チーム名 → GK名の順に並べて返す', async () => {
    await createGoalkeeper('鈴木', '△△高校');
    await createGoalkeeper('佐藤', '○○大学');
    await createGoalkeeper('伊藤', '○○大学');
    const list = await goalkeepers.list();
    expect(list.map((g) => `${g.teamName}/${g.name}`)).toEqual(['△△高校/鈴木', '○○大学/伊藤', '○○大学/佐藤']);
  });

  it('一覧用に試合数とシュート数を数える', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    await shots.save(shotInput(match, goalkeeper));
    await shots.save(shotInput(match, goalkeeper, { videoTime: 70 }));
    expect(await goalkeepers.listSummaries()).toEqual([expect.objectContaining({ matchCount: 1, shotCount: 2 })]);
  });

  it('削除すると、そのGKの出場記録とシュートも消えるが、試合と他のGKのシュートは残る', async () => {
    const target = await createGoalkeeper('山田');
    const other = await createGoalkeeper('佐藤');
    const match = await createMatch([target.id, other.id]);
    await shots.save(shotInput(match, target));
    await shots.save(shotInput(match, other));

    expect(await goalkeepers.countRelated(target.id)).toEqual({ matchCount: 1, shotCount: 1 });
    await goalkeepers.delete(target.id);

    expect(await goalkeepers.get(target.id)).toBeUndefined();
    expect(await matches.get(match.id)).toBeDefined();
    expect(await matches.goalkeeperIdsOf(match.id)).toEqual([other.id]);
    expect((await shots.listByMatch(match.id)).map((s) => s.goalkeeperId)).toEqual([other.id]);
  });
});

describe('matchRepository', () => {
  it('URL から動画IDを取り出して保存し、GKを紐づける', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    expect(match.youtubeVideoId).toBe('dQw4w9WgXcQ');
    expect(await matches.goalkeeperIdsOf(match.id)).toEqual([goalkeeper.id]);
  });

  it('YouTube の URL でなければ保存しない', async () => {
    const goalkeeper = await createGoalkeeper();
    const result = await matches.save(
      { date: '2026-09-20', homeTeam: 'A', awayTeam: 'B', youtubeUrl: 'https://example.com/video' },
      [goalkeeper.id],
    );
    expect(result).toEqual({ ok: false, error: { code: 'invalid_url' } });
    expect(await db.matches.count()).toBe(0);
  });

  it('GKが1人も紐づいていなければ保存しない', async () => {
    const result = await matches.save({ date: '2026-09-20', homeTeam: 'A', awayTeam: 'B', youtubeUrl: URL_A }, []);
    expect(result).toEqual({ ok: false, error: { code: 'no_goalkeeper' } });
  });

  it('GKの紐づけを差分で更新する', async () => {
    const a = await createGoalkeeper('A');
    const b = await createGoalkeeper('B');
    const c = await createGoalkeeper('C');
    const match = await createMatch([a.id, b.id]);

    const result = await matches.save({ ...match }, [b.id, c.id]);
    expect(result.ok).toBe(true);
    expect((await matches.goalkeeperIdsOf(match.id)).sort()).toEqual([b.id, c.id].sort());
  });

  it('担当シュートがあるGKの紐づけは解除できず、何も変更しない', async () => {
    const a = await createGoalkeeper('A');
    const b = await createGoalkeeper('B');
    const match = await createMatch([a.id, b.id]);
    await shots.save(shotInput(match, a));

    const result = await matches.save({ ...match, homeTeam: '変更後' }, [b.id]);
    expect(result).toEqual({ ok: false, error: { code: 'goalkeeper_has_shots', goalkeeperIds: [a.id] } });
    expect((await matches.get(match.id))?.homeTeam).toBe('○○大学');
    expect((await matches.goalkeeperIdsOf(match.id)).sort()).toEqual([a.id, b.id].sort());
  });

  it('GKの試合を日付の新しい順に返す', async () => {
    const goalkeeper = await createGoalkeeper();
    await createMatch([goalkeeper.id], '2026-09-13');
    await createMatch([goalkeeper.id], '2026-09-20');
    const other = await createGoalkeeper('他');
    await createMatch([other.id], '2026-09-27');
    expect((await matches.listByGoalkeeper(goalkeeper.id)).map((m) => m.date)).toEqual(['2026-09-20', '2026-09-13']);
  });

  it('削除すると、その試合の出場記録とシュートも消える', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    const keep = await createMatch([goalkeeper.id]);
    await shots.save(shotInput(match, goalkeeper));
    await shots.save(shotInput(keep, goalkeeper));

    expect(await matches.countShots(match.id)).toBe(1);
    await matches.delete(match.id);

    expect(await matches.get(match.id)).toBeUndefined();
    expect(await matches.goalkeeperIdsOf(match.id)).toEqual([]);
    expect(await shots.listByGoalkeeper(goalkeeper.id)).toHaveLength(1);
    expect(await goalkeepers.get(goalkeeper.id)).toBeDefined();
  });
});

describe('shotRepository', () => {
  it('試合のシュートを動画時刻の順に返す', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    const other = await createMatch([goalkeeper.id]);
    await shots.save(shotInput(match, goalkeeper, { videoTime: 300 }));
    await shots.save(shotInput(match, goalkeeper, { videoTime: 12.5 }));
    await shots.save(shotInput(other, goalkeeper, { videoTime: 1 }));
    await shots.save(shotInput(match, goalkeeper, { videoTime: 100 }));
    expect((await shots.listByMatch(match.id)).map((s) => s.videoTime)).toEqual([12.5, 100, 300]);
  });

  it('結果とコースの組み合わせが不正なシュートは保存しない', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    await expect(shots.save(shotInput(match, goalkeeper, { result: 'miss', goalCell: 3 }))).rejects.toBeInstanceOf(ZodError);
  });

  it('更新では登録日時を保つ', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    const created = await shots.save(shotInput(match, goalkeeper));
    const updated = await shots.save({ ...shotInput(match, goalkeeper, { result: 'save' }), id: created.id });
    expect(updated).toMatchObject({ id: created.id, createdAt: created.createdAt, result: 'save' });
  });

  it('削除したシュートを返し、restore で元に戻せる', async () => {
    const goalkeeper = await createGoalkeeper();
    const match = await createMatch([goalkeeper.id]);
    const created = await shots.save(shotInput(match, goalkeeper));

    const deleted = await shots.delete(created.id);
    expect(deleted).toEqual(created);
    expect(await shots.get(created.id)).toBeUndefined();

    await shots.restore(created);
    expect(await shots.get(created.id)).toEqual(created);
  });

  it('存在しないシュートの削除は undefined を返す', async () => {
    expect(await shots.delete('missing')).toBeUndefined();
  });
});

describe('settingsRepository', () => {
  it('保存されていなければ既定値を返す', async () => {
    expect(await settings.get()).toEqual({
      highlightPreSeconds: 3,
      highlightPostSeconds: 2,
      autoResumeAfterRecord: true,
      lowSampleThreshold: 3,
      lastBackupAt: null,
    });
  });

  it('一部の設定だけを更新できる', async () => {
    await settings.update({ highlightPreSeconds: 5 });
    await settings.update({ autoResumeAfterRecord: false });
    expect(await settings.get()).toMatchObject({ highlightPreSeconds: 5, autoResumeAfterRecord: false, highlightPostSeconds: 2 });
  });

  it('範囲外の値は保存しない', async () => {
    await expect(settings.update({ lowSampleThreshold: 0 })).rejects.toBeInstanceOf(ZodError);
    expect((await settings.get()).lowSampleThreshold).toBe(3);
  });
});
