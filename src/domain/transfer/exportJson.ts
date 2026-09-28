import { CURRENT_SCHEMA_VERSION, EXPORT_APP_NAME } from '../schemas';
import type { ExportFile, ExportScope, Goalkeeper, Match, MatchGoalkeeper, Settings, Shot } from '../types';

export type ExportData = {
  goalkeepers: Goalkeeper[];
  matches: Match[];
  matchGoalkeepers: MatchGoalkeeper[];
  shots: Shot[];
  /** 全データの書き出しのみ含める */
  settings?: Settings;
};

/** 書き出しファイルの内容を作る（functional-design.md 5.5） */
export function buildExportFile(data: ExportData, scope: ExportScope, now: Date): ExportFile {
  return {
    app: EXPORT_APP_NAME,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    scope,
    goalkeepers: data.goalkeepers,
    matches: data.matches,
    matchGoalkeepers: data.matchGoalkeepers,
    shots: data.shots,
    ...(scope === 'all' && data.settings !== undefined && { settings: data.settings }),
  };
}

export function serializeExportFile(file: ExportFile): string {
  return JSON.stringify(file, null, 2);
}

/**
 * 書き出しファイル名。例: handball_analysis_all_20260928.json、handball_analysis_gk_山田太郎_20260928.json
 * label はファイル名に使える形にしたもの（GK名・対戦カードなど）を渡す。
 */
export function buildExportFileName(scope: ExportScope, localDate: string, label?: string): string {
  const scopePart = { all: 'all', goalkeeper: 'gk', match: 'match' }[scope];
  const datePart = localDate.replaceAll('-', '');
  const labelPart = label ? `_${label}` : '';
  return `${EXPORT_APP_NAME}_${scopePart}${labelPart}_${datePart}.json`;
}
