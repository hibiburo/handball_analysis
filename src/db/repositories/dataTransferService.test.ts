import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppDatabase } from '@/db/database';
import { parseImportFile } from '@/domain/transfer/importJson';
import { serializeExportFile } from '@/domain/transfer/exportJson';
import type { ExportFile } from '@/domain/types';
import { buildGoalkeeper, buildMatch, buildMatchGoalkeeper, buildShot } from '@/test/factories';
import { createTestDatabase } from '@/test/db';
import { dataTransferService } from './dataTransferService';
import { settingsRepository } from './settingsRepository';

const NOW = new Date('2026-09-28T05:00:00.000Z');

let db: AppDatabase;
let service: ReturnType<typeof dataTransferService>;

beforeEach(() => {
  db = createTestDatabase();
  service = dataTransferService(db);
});

afterEach(async () => {
  await db.delete();
});

/** GK2人・試合2つ（試合1にGK A・B、試合2にGK A）・シュート4本のデータを入れる */
async function seed() {
  const a = buildGoalkeeper({ name: 'A' });
  const b = buildGoalkeeper({ name: 'B' });
  const match1 = buildMatch();
  const match2 = buildMatch({ date: '2026-09-27' });
  const shots = [
    buildShot({ matchId: match1.id, goalkeeperId: a.id }),
    buildShot({ matchId: match1.id, goalkeeperId: b.id, result: 'save' }),
    buildShot({ matchId: match2.id, goalkeeperId: a.id, result: 'miss', goalCell: undefined }),
    buildShot({ matchId: match2.id, goalkeeperId: a.id, result: 'post', goalCell: undefined }),
  ];
  await db.goalkeepers.bulkAdd([a, b]);
  await db.matches.bulkAdd([match1, match2]);
  await db.matchGoalkeepers.bulkAdd([
    buildMatchGoalkeeper(match1, a),
    buildMatchGoalkeeper(match1, b),
    buildMatchGoalkeeper(match2, a),
  ]);
  await db.shots.bulkAdd(shots);
  return { a, b, match1, match2, shots };
}

/** 書き出し → JSON 文字列 → 検証、を通して取り込み用のファイルにする */
function roundTrip(file: ExportFile): ExportFile {
  const parsed = parseImportFile(serializeExportFile(file));
  if (!parsed.ok) throw new Error(`検証に失敗: ${parsed.error.code}`);
  return parsed.value;
}

describe('書き出し', () => {
  it('全データを書き出し、最終バックアップ日時を記録する', async () => {
    await seed();
    const file = await service.exportAll(NOW);
    expect(file.scope).toBe('all');
    expect([file.goalkeepers.length, file.matches.length, file.matchGoalkeepers.length, file.shots.length]).toEqual([
      2, 2, 3, 4,
    ]);
    expect(file.settings).toBeDefined();
    expect((await settingsRepository(db).get()).lastBackupAt).toBe(NOW.toISOString());
  });

  it('GK単位では、そのGKが出場した試合とそのGKのシュートだけを書き出す', async () => {
    const { b, match1 } = await seed();
    const file = await service.exportGoalkeeper(b.id, NOW);
    expect(file?.goalkeepers.map((g) => g.id)).toEqual([b.id]);
    expect(file?.matches.map((m) => m.id)).toEqual([match1.id]);
    expect(file?.shots).toHaveLength(1);
    expect(file).not.toHaveProperty('settings');
  });

  it('試合単位では、その試合の全GKと全シュートを書き出す', async () => {
    const { match1 } = await seed();
    const file = await service.exportMatch(match1.id, NOW);
    expect(file?.goalkeepers).toHaveLength(2);
    expect(file?.shots).toHaveLength(2);
  });

  it('存在しないGK・試合は undefined', async () => {
    expect(await service.exportGoalkeeper('missing', NOW)).toBeUndefined();
    expect(await service.exportMatch('missing', NOW)).toBeUndefined();
  });
});

describe('取り込み', () => {
  it('全データを書き出して空のデータベースに取り込むと、同じ内容が復元される', async () => {
    await seed();
    const file = roundTrip(await service.exportAll(NOW));

    const restoredDb = createTestDatabase();
    const restoredService = dataTransferService(restoredDb);
    expect(await restoredService.previewImport(file)).toEqual({
      ok: true,
      value: { counts: { goalkeepers: 2, matches: 2, shots: 4 }, conflicts: { goalkeepers: 0, matches: 0, shots: 0 } },
    });
    expect(await restoredService.importFile(file, 'skip')).toEqual({
      ok: true,
      value: { added: 8, updated: 0, skipped: 0 },
    });

    const again = await restoredService.exportAll(NOW);
    const sortById = <T extends { id: string }>(items: T[]) => [...items].sort((x, y) => x.id.localeCompare(y.id));
    expect(sortById(again.shots)).toEqual(sortById(file.shots));
    expect(sortById(again.goalkeepers)).toEqual(sortById(file.goalkeepers));
    expect(await restoredDb.matchGoalkeepers.count()).toBe(3);
    await restoredDb.delete();
  });

  it('重複時に「スキップ」を選ぶと既存データを残す', async () => {
    const { a } = await seed();
    const file = roundTrip(await service.exportAll(NOW));
    await db.goalkeepers.update(a.id, { name: '変更済み' });

    const result = await service.importFile(file, 'skip');
    expect(result).toEqual({ ok: true, value: { added: 0, updated: 0, skipped: 8 } });
    expect((await db.goalkeepers.get(a.id))?.name).toBe('変更済み');
  });

  it('重複時に「上書き」を選ぶとファイルの内容で置き換える', async () => {
    const { a } = await seed();
    const file = roundTrip(await service.exportAll(NOW));
    await db.goalkeepers.update(a.id, { name: '変更済み' });

    const result = await service.importFile(file, 'overwrite');
    expect(result).toEqual({ ok: true, value: { added: 0, updated: 8, skipped: 0 } });
    expect((await db.goalkeepers.get(a.id))?.name).toBe('A');
  });

  it('参照先が見つからないファイルはプレビューの段階でエラーにし、取り込みでも何も保存しない', async () => {
    const { match1 } = await seed();
    const file = roundTrip(await service.exportMatch(match1.id, NOW).then((f) => ({ ...f!, goalkeepers: [] })));

    const emptyDb = createTestDatabase();
    const emptyService = dataTransferService(emptyDb);
    const preview = await emptyService.previewImport(file);
    expect(!preview.ok && preview.error.code).toBe('broken_reference');

    const result = await emptyService.importFile(file, 'overwrite');
    expect(!result.ok && result.error.code).toBe('broken_reference');
    expect(await emptyDb.matches.count()).toBe(0);
    await emptyDb.delete();
  });

  it('保存の途中で失敗した場合はすべて元に戻す', async () => {
    const file = roundTrip(
      await (async () => {
        await seed();
        return service.exportAll(NOW);
      })(),
    );
    const emptyDb = createTestDatabase();
    const emptyService = dataTransferService(emptyDb);
    // シュートの保存時に失敗させる
    emptyDb.shots.hook('creating', () => {
      throw new Error('書き込みに失敗');
    });

    await expect(emptyService.importFile(file, 'overwrite')).rejects.toThrow();
    expect(await emptyDb.goalkeepers.count()).toBe(0);
    expect(await emptyDb.matches.count()).toBe(0);
    await emptyDb.delete();
  });
});
