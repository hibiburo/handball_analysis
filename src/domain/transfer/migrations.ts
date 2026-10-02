import { err, ok, type Result } from '@/lib/result';
import { isShotType } from '../enums';
import { CURRENT_SCHEMA_VERSION } from '../schemas';

export type MigrationError = { code: 'unsupported_version'; version: unknown };

type RawFile = Record<string, unknown>;

/**
 * バージョン n のファイルをバージョン n+1 の形に変換する関数。
 * キーは変換前のバージョン。検証はすべての変換のあとにスキーマで行うため、ここでは形を整えるだけにする。
 */
const steps: Record<number, (raw: RawFile) => RawFile> = {
  // 1 → 2: シュート種別を打ち方（ジャンプなど）から攻撃の形（サイドシュートなど）に変更した。
  // 古い種別は新しい種別に対応しないため、種別だけを未入力にする（.steering/20261002-change-shot-types）
  1: (raw) => ({
    ...raw,
    schemaVersion: 2,
    shots: Array.isArray(raw['shots']) ? raw['shots'].map(removeOldShotType) : raw['shots'],
  }),
};

function removeOldShotType(shot: unknown): unknown {
  if (typeof shot !== 'object' || shot === null || !('shotType' in shot) || isShotType(shot.shotType)) return shot;
  const { shotType: _, ...rest } = shot;
  return rest;
}

/**
 * 古い schemaVersion の書き出しファイルを現在の形式に変換する（functional-design.md 5.5）。
 * 新しいバージョンのファイル（このアプリより新しい版で書き出したもの）は拒否する。
 *
 * 形式を変えるときは、CURRENT_SCHEMA_VERSION を上げ、steps に「n → n+1」の変換を追加する。
 */
export function migrateExportFile(raw: RawFile): Result<RawFile, MigrationError> {
  const version = raw['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > CURRENT_SCHEMA_VERSION) {
    return err({ code: 'unsupported_version', version });
  }
  let current = raw;
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = steps[v];
    if (!step) return err({ code: 'unsupported_version', version });
    current = step(current);
  }
  return ok(current);
}
