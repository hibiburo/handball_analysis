import { err, ok, type Result } from '@/lib/result';
import { CURRENT_SCHEMA_VERSION } from '../schemas';

export type MigrationError = { code: 'unsupported_version'; version: unknown };

/**
 * 古い schemaVersion の書き出しファイルを現在の形式に変換する（functional-design.md 5.5）。
 * 新しいバージョンのファイル（このアプリより新しい版で書き出したもの）は拒否する。
 *
 * 形式を変えるときは、CURRENT_SCHEMA_VERSION を上げ、ここに「n → n+1」の変換を追加する。
 */
export function migrateExportFile(raw: Record<string, unknown>): Result<Record<string, unknown>, MigrationError> {
  const version = raw['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > CURRENT_SCHEMA_VERSION) {
    return err({ code: 'unsupported_version', version });
  }
  // 現在はバージョン1のみのため、変換は不要
  return ok(raw);
}
