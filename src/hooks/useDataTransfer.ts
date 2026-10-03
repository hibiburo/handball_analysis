import { useLiveQuery } from 'dexie-react-hooks';
import { appDb } from '@/db/database';
import { dataTransferService } from '@/db/repositories/dataTransferService';
import { buildSceneSheetFileName, buildSceneSheetRows, SCENE_SHEET_HEADERS } from '@/domain/sceneSheet';
import { buildExportFileName, serializeExportFile } from '@/domain/transfer/exportJson';
import type { ExportFile, Goalkeeper, Match, Shot } from '@/domain/types';
import { downloadBlob, downloadTextFile, sanitizeFilename } from '@/lib/download';
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
 * 分析画面のシーン一覧を Excel（.xlsx）でダウンロードする（.steering/20261003-scene-excel-export）。
 * shots はシーン一覧と同じ順番で渡す。Excel を作る部品は使うときだけ読み込む。
 */
export async function downloadSceneExcel(params: {
  goalkeeper: Goalkeeper;
  shots: readonly Shot[];
  preSeconds: number;
  postSeconds: number;
}): Promise<void> {
  const { goalkeeper, ...rest } = params;
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = SCENE_SHEET_HEADERS.map((value) => ({ value, fontWeight: 'bold' as const }));
  // 時間は文字列のセルにする（Excel が時刻の数値に変換しないように）
  const rows = buildSceneSheetRows(rest).map((row) => [
    { value: row.shotType, type: String },
    { value: row.start, type: String },
    { value: row.end, type: String },
  ]);
  const blob = await writeXlsxFile([header, ...rows], {
    sheet: 'シーン',
    columns: [{ width: 16 }, { width: 14 }, { width: 14 }],
    stickyRowsCount: 1,
  }).toBlob();
  downloadBlob(buildSceneSheetFileName(sanitizeFilename(goalkeeper.name), todayLocalDate()), blob);
}

/** 記録データ（シュート）が1件以上あるか。バックアップ警告の判定に使う */
export function useHasShots() {
  return useLiveQuery(async () => (await appDb.shots.limit(1).count()) > 0, []);
}
