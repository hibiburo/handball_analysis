import { buildExportFile } from '@/domain/transfer/exportJson';
import {
  buildImportPreview,
  checkReferences,
  type ExistingIds,
  type ImportError,
  type ImportPreview,
} from '@/domain/transfer/importJson';
import type { ExportFile, Goalkeeper, Match } from '@/domain/types';
import { err, ok, type Result } from '@/lib/result';
import { SETTINGS_KEY, type AppDatabase } from '../database';
import { settingsRepository } from './settingsRepository';

export type ConflictPolicy = 'overwrite' | 'skip';

export type ImportSummary = {
  added: number;
  updated: number;
  skipped: number;
};

export function dataTransferService(db: AppDatabase) {
  const settings = settingsRepository(db);

  async function getExistingIds(): Promise<ExistingIds> {
    const [goalkeeperIds, matchIds, shotIds, matchGoalkeeperKeys] = await Promise.all([
      db.goalkeepers.toCollection().primaryKeys(),
      db.matches.toCollection().primaryKeys(),
      db.shots.toCollection().primaryKeys(),
      db.matchGoalkeepers.toCollection().primaryKeys(),
    ]);
    return {
      goalkeeperIds: new Set(goalkeeperIds),
      matchIds: new Set(matchIds),
      shotIds: new Set(shotIds),
      matchGoalkeeperKeys: new Set(matchGoalkeeperKeys.map(([matchId, goalkeeperId]) => `${matchId}+${goalkeeperId}`)),
    };
  }

  return {
    /** 全データを書き出し、最終バックアップ日時を記録する */
    async exportAll(now: Date): Promise<ExportFile> {
      const file = await db.transaction(
        'r',
        [db.goalkeepers, db.matches, db.matchGoalkeepers, db.shots, db.settings],
        async () =>
          buildExportFile(
            {
              goalkeepers: await db.goalkeepers.toArray(),
              matches: await db.matches.toArray(),
              matchGoalkeepers: await db.matchGoalkeepers.toArray(),
              shots: await db.shots.toArray(),
              settings: await settings.get(),
            },
            'all',
            now,
          ),
      );
      await settings.update({ lastBackupAt: now.toISOString() });
      return file;
    },

    /** GKと、そのGKが出場した試合・そのGKのシュートを書き出す */
    async exportGoalkeeper(goalkeeperId: string, now: Date): Promise<ExportFile | undefined> {
      return db.transaction('r', [db.goalkeepers, db.matches, db.matchGoalkeepers, db.shots], async () => {
        const goalkeeper = await db.goalkeepers.get(goalkeeperId);
        if (!goalkeeper) return undefined;
        const matchGoalkeepers = await db.matchGoalkeepers.where('goalkeeperId').equals(goalkeeperId).toArray();
        const matches = await db.matches.bulkGet(matchGoalkeepers.map((mg) => mg.matchId));
        return buildExportFile(
          {
            goalkeepers: [goalkeeper],
            matches: matches.filter((m): m is Match => m !== undefined),
            matchGoalkeepers,
            shots: await db.shots.where('goalkeeperId').equals(goalkeeperId).toArray(),
          },
          'goalkeeper',
          now,
        );
      });
    },

    /** 試合と、その試合に出場した全GK・その試合の全シュートを書き出す */
    async exportMatch(matchId: string, now: Date): Promise<ExportFile | undefined> {
      return db.transaction('r', [db.goalkeepers, db.matches, db.matchGoalkeepers, db.shots], async () => {
        const match = await db.matches.get(matchId);
        if (!match) return undefined;
        const matchGoalkeepers = await db.matchGoalkeepers.where('matchId').equals(matchId).toArray();
        const goalkeepers = await db.goalkeepers.bulkGet(matchGoalkeepers.map((mg) => mg.goalkeeperId));
        return buildExportFile(
          {
            goalkeepers: goalkeepers.filter((g): g is Goalkeeper => g !== undefined),
            matches: [match],
            matchGoalkeepers,
            shots: await db.shots.where('matchId').equals(matchId).toArray(),
          },
          'match',
          now,
        );
      });
    },

    /** 取り込み前の確認。参照先が見つからないファイルはここでエラーにする */
    async previewImport(file: ExportFile): Promise<Result<ImportPreview, ImportError>> {
      const existing = await getExistingIds();
      const references = checkReferences(file, existing);
      if (!references.ok) return references;
      return ok(buildImportPreview(file, existing));
    },

    /**
     * ファイルのデータを1トランザクションで保存する。途中で失敗した場合はすべて元に戻る（functional-design.md 5.5）。
     * 既存データと ID が重なるものは、policy に従って上書きまたはスキップする。
     */
    async importFile(file: ExportFile, policy: ConflictPolicy): Promise<Result<ImportSummary, ImportError>> {
      return db.transaction(
        'rw',
        [db.goalkeepers, db.matches, db.matchGoalkeepers, db.shots, db.settings],
        async () => {
          const existing = await getExistingIds();
          const references = checkReferences(file, existing);
          if (!references.ok) return err(references.error);

          const summary: ImportSummary = { added: 0, updated: 0, skipped: 0 };
          async function upsert<T extends { id: string }>(
            table: { bulkPut: (items: T[]) => Promise<unknown> },
            items: T[],
            existingIds: ReadonlySet<string>,
          ) {
            const fresh = items.filter((item) => !existingIds.has(item.id));
            const conflicting = items.filter((item) => existingIds.has(item.id));
            summary.added += fresh.length;
            if (policy === 'overwrite') {
              summary.updated += conflicting.length;
              await table.bulkPut(items);
            } else {
              summary.skipped += conflicting.length;
              await table.bulkPut(fresh);
            }
          }

          await upsert(db.goalkeepers, file.goalkeepers, existing.goalkeeperIds);
          await upsert(db.matches, file.matches, existing.matchIds);
          await upsert(db.shots, file.shots, existing.shotIds);
          // 出場記録は ID を持たない紐づけのため、常に追加する（同じ組み合わせは1件にまとまる）
          await db.matchGoalkeepers.bulkPut(file.matchGoalkeepers);
          if (file.settings && policy === 'overwrite') {
            await db.settings.put({ ...file.settings, key: SETTINGS_KEY });
          }
          return ok(summary);
        },
      );
    },
  };
}
