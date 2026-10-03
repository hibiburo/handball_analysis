import { useLiveQuery } from 'dexie-react-hooks';
import { appDb } from '@/db/database';
import { dataTransferService } from '@/db/repositories/dataTransferService';
import { buildSceneCsv, buildSceneCsvFileName } from '@/domain/transfer/exportCsv';
import { buildExportFileName, serializeExportFile } from '@/domain/transfer/exportJson';
import type { ExportFile, Goalkeeper, Match, Shot } from '@/domain/types';
import { downloadTextFile, sanitizeFilename } from '@/lib/download';
import { todayLocalDate } from '@/lib/time';

export type { ConflictPolicy, ImportSummary } from '@/db/repositories/dataTransferService';

/** 書き出し・取り込みの操作 */
export const dataTransferActions = dataTransferService(appDb);

function download(file: ExportFile, label?: string) {
  const name = buildExportFileName(file.scope, todayLocalDate(), label ? sanitizeFilename(label) : undefined);
  downloadTextFile(name, serializeExportFile(file), 'application/json');
}

/** 全データを書き出してダウンロードする（最終バックアップ日時も更新される） */
export async function downloadAllData(): Promise<void> {
  download(await dataTransferActions.exportAll(new Date()));
}

/** GK単位で書き出してダウンロードする */
export async function downloadGoalkeeperData(goalkeeper: Goalkeeper): Promise<void> {
  const file = await dataTransferActions.exportGoalkeeper(goalkeeper.id, new Date());
  if (file) download(file, goalkeeper.name);
}

/** 試合単位で書き出してダウンロードする */
export async function downloadMatchData(match: Match): Promise<void> {
  const file = await dataTransferActions.exportMatch(match.id, new Date());
  if (file) download(file, `${match.homeTeam}vs${match.awayTeam}`);
}

/**
 * 選手に共有するためのシーン一覧（動画リンク付き）を CSV でダウンロードする（.steering/20261003-scene-link-csv）。
 * shots はシーン一覧と同じ順番で渡す。
 */
export function downloadSceneCsv(params: {
  goalkeeper: Goalkeeper;
  shots: readonly Shot[];
  matchesById: ReadonlyMap<string, Match>;
  preSeconds: number;
}): void {
  const { goalkeeper, ...rest } = params;
  const name = buildSceneCsvFileName(sanitizeFilename(goalkeeper.name), todayLocalDate());
  downloadTextFile(name, buildSceneCsv(rest), 'text/csv');
}

/** 記録データ（シュート）が1件以上あるか。バックアップ警告の判定に使う */
export function useHasShots() {
  return useLiveQuery(async () => (await appDb.shots.limit(1).count()) > 0, []);
}
