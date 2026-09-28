import { err, ok, type Result } from '@/lib/result';
import { CURRENT_SCHEMA_VERSION, EXPORT_APP_NAME, exportFileSchema } from '../schemas';
import type { ExportFile } from '../types';
import { migrateExportFile } from './migrations';

/** 取り込めるファイルの最大サイズ（architecture.md 4章） */
export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;

export type ImportError =
  | { code: 'too_large' }
  | { code: 'invalid_json' }
  | { code: 'not_app_file' }
  | { code: 'unsupported_version'; version: unknown }
  | { code: 'invalid_schema'; issues: string[] }
  | { code: 'broken_reference'; details: string[] };

/** エラーの詳細として表示する最大件数 */
const MAX_ISSUE_COUNT = 5;

/**
 * 取り込みファイルの内容を検証し、現在の形式の書き出しファイルとして返す。
 * 検証に失敗した場合は何も保存しない前提で、理由を返す（functional-design.md 5.5）。
 */
export function parseImportFile(text: string): Result<ExportFile, ImportError> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err({ code: 'invalid_json' });
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw) || !('app' in raw) || raw.app !== EXPORT_APP_NAME) {
    return err({ code: 'not_app_file' });
  }

  const migrated = migrateExportFile(raw as Record<string, unknown>); // 直前でオブジェクトであることを確認済み
  if (!migrated.ok) {
    return err(migrated.error);
  }

  const parsed = exportFileSchema.safeParse(migrated.value);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, MAX_ISSUE_COUNT)
      .map((issue) => `${issue.path.join('.') || '(ファイル全体)'}: ${issue.message}`);
    return err({ code: 'invalid_schema', issues });
  }

  const duplicated = findDuplicateIds(parsed.data);
  if (duplicated.length > 0) {
    return err({ code: 'invalid_schema', issues: duplicated.slice(0, MAX_ISSUE_COUNT) });
  }

  return ok(parsed.data);
}

function findDuplicateIds(file: ExportFile): string[] {
  const issues: string[] = [];
  const check = (name: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) issues.push(`${name}: ID ${id} が重複しています`);
      seen.add(id);
    }
  };
  check('goalkeepers', file.goalkeepers.map((g) => g.id));
  check('matches', file.matches.map((m) => m.id));
  check('shots', file.shots.map((s) => s.id));
  check('matchGoalkeepers', file.matchGoalkeepers.map((mg) => `${mg.matchId}+${mg.goalkeeperId}`));
  return issues;
}

export type ExistingIds = {
  goalkeeperIds: ReadonlySet<string>;
  matchIds: ReadonlySet<string>;
  shotIds: ReadonlySet<string>;
  /** `${matchId}+${goalkeeperId}` の形 */
  matchGoalkeeperKeys: ReadonlySet<string>;
};

/**
 * 参照整合性を検証する。シュート・出場GKの matchId / goalkeeperId が、ファイル内または既存データに存在すること。
 */
export function checkReferences(file: ExportFile, existing: ExistingIds): Result<void, ImportError> {
  const goalkeeperIds = new Set([...existing.goalkeeperIds, ...file.goalkeepers.map((g) => g.id)]);
  const matchIds = new Set([...existing.matchIds, ...file.matches.map((m) => m.id)]);
  const details: string[] = [];

  for (const mg of file.matchGoalkeepers) {
    if (!matchIds.has(mg.matchId)) details.push(`出場GK: 試合 ${mg.matchId} が見つかりません`);
    if (!goalkeeperIds.has(mg.goalkeeperId)) details.push(`出場GK: GK ${mg.goalkeeperId} が見つかりません`);
  }
  for (const shot of file.shots) {
    if (!matchIds.has(shot.matchId)) details.push(`シュート ${shot.id}: 試合 ${shot.matchId} が見つかりません`);
    if (!goalkeeperIds.has(shot.goalkeeperId)) {
      details.push(`シュート ${shot.id}: GK ${shot.goalkeeperId} が見つかりません`);
    }
  }

  if (details.length > 0) {
    return err({ code: 'broken_reference', details: details.slice(0, MAX_ISSUE_COUNT) });
  }
  return ok(undefined);
}

export type ImportPreview = {
  counts: { goalkeepers: number; matches: number; shots: number };
  /** 既存データと ID が重なる件数 */
  conflicts: { goalkeepers: number; matches: number; shots: number };
};

/** 取り込み前に表示する件数と重複件数 */
export function buildImportPreview(file: ExportFile, existing: ExistingIds): ImportPreview {
  const countIn = (ids: string[], set: ReadonlySet<string>) => ids.filter((id) => set.has(id)).length;
  return {
    counts: { goalkeepers: file.goalkeepers.length, matches: file.matches.length, shots: file.shots.length },
    conflicts: {
      goalkeepers: countIn(file.goalkeepers.map((g) => g.id), existing.goalkeeperIds),
      matches: countIn(file.matches.map((m) => m.id), existing.matchIds),
      shots: countIn(file.shots.map((s) => s.id), existing.shotIds),
    },
  };
}

/** 取り込みエラーを利用者向けの文言にする（何が起きたか＋どうすればよいか。development-guidelines.md 2.5） */
export function importErrorMessage(error: ImportError): string {
  switch (error.code) {
    case 'too_large':
      return 'ファイルが大きすぎます（上限 20MB）。GK単位や試合単位で書き出したファイルを取り込んでください。';
    case 'invalid_json':
      return 'ファイルを読み込めませんでした。このアプリで書き出した JSON ファイルを選んでください。';
    case 'not_app_file':
      return 'このアプリで書き出したファイルではありません。handball_analysis で書き出した JSON ファイルを選んでください。';
    case 'unsupported_version':
      return typeof error.version === 'number' && error.version > CURRENT_SCHEMA_VERSION
        ? 'より新しいバージョンのアプリで書き出したファイルのため、取り込めません。アプリを再読み込みして最新版にしてから取り込んでください。'
        : 'ファイルのバージョンに対応していないため、取り込めません。';
    case 'invalid_schema':
      return 'ファイルの内容に不正なデータが含まれているため、取り込めません。書き出し直したファイルで試してください。';
    case 'broken_reference':
      return 'ファイル内のシュートや出場GKが、存在しない試合・GKを参照しているため、取り込めません。全データまたはGK単位で書き出したファイルを取り込んでください。';
  }
}
