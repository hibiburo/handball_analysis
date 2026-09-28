import { describe, expect, it } from 'vitest';
import type { ExportFile } from '@/domain/types';
import { buildGoalkeeper, buildMatch, buildMatchGoalkeeper, buildShot } from '@/test/factories';
import { buildExportFile, buildExportFileName, serializeExportFile } from './exportJson';
import {
  buildImportPreview,
  checkReferences,
  importErrorMessage,
  parseImportFile,
  type ExistingIds,
  type ImportError,
} from './importJson';
import { migrateExportFile } from './migrations';

const NOW = new Date('2026-09-28T05:00:00.000Z');

function sampleData() {
  const goalkeeper = buildGoalkeeper();
  const match = buildMatch();
  const shots = [
    buildShot({ matchId: match.id, goalkeeperId: goalkeeper.id, result: 'goal', goalCell: 1 }),
    buildShot({ matchId: match.id, goalkeeperId: goalkeeper.id, result: 'save', goalCell: 9, goalkeeperAction: 'hand' }),
    buildShot({ matchId: match.id, goalkeeperId: goalkeeper.id, result: 'miss', goalCell: undefined }),
  ];
  return {
    goalkeepers: [goalkeeper],
    matches: [match],
    matchGoalkeepers: [buildMatchGoalkeeper(match, goalkeeper)],
    shots,
  };
}

const noExisting: ExistingIds = {
  goalkeeperIds: new Set(),
  matchIds: new Set(),
  shotIds: new Set(),
  matchGoalkeeperKeys: new Set(),
};

describe('buildExportFile', () => {
  it('アプリ名・スキーマバージョン・書き出し日時・範囲を含める', () => {
    const file = buildExportFile(sampleData(), 'goalkeeper', NOW);
    expect(file).toMatchObject({
      app: 'handball_analysis',
      schemaVersion: 1,
      exportedAt: '2026-09-28T05:00:00.000Z',
      scope: 'goalkeeper',
    });
  });

  it('設定は全データの書き出しのときだけ含める', () => {
    const settings = {
      highlightPreSeconds: 3,
      highlightPostSeconds: 2,
      autoResumeAfterRecord: true,
      lowSampleThreshold: 3,
      lastBackupAt: null,
    };
    expect(buildExportFile({ ...sampleData(), settings }, 'all', NOW).settings).toEqual(settings);
    expect(buildExportFile({ ...sampleData(), settings }, 'match', NOW)).not.toHaveProperty('settings');
  });
});

describe('buildExportFileName', () => {
  it('範囲・ラベル・日付からファイル名を作る', () => {
    expect(buildExportFileName('all', '2026-09-28')).toBe('handball_analysis_all_20260928.json');
    expect(buildExportFileName('goalkeeper', '2026-09-28', '山田太郎')).toBe(
      'handball_analysis_gk_山田太郎_20260928.json',
    );
    expect(buildExportFileName('match', '2026-09-28', '○○大vs□□大')).toBe(
      'handball_analysis_match_○○大vs□□大_20260928.json',
    );
  });
});

describe('parseImportFile', () => {
  function expectError(text: string): ImportError {
    const result = parseImportFile(text);
    if (result.ok) throw new Error('エラーになるはずが成功した');
    return result.error;
  }

  it('書き出したファイルを取り込むと同じ内容になる', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    const result = parseImportFile(serializeExportFile(file));
    expect(result).toEqual({ ok: true, value: JSON.parse(serializeExportFile(file)) });
  });

  it('JSON として読めないファイルは invalid_json', () => {
    expect(expectError('{not json')).toEqual({ code: 'invalid_json' });
  });

  it.each([['配列', '[]'], ['別のアプリ', '{"app":"other"}'], ['null', 'null'], ['文字列', '"text"']])(
    '%s は not_app_file',
    (_, text) => {
      expect(expectError(text)).toEqual({ code: 'not_app_file' });
    },
  );

  it('新しいバージョンのファイルは unsupported_version', () => {
    const file = { ...buildExportFile(sampleData(), 'all', NOW), schemaVersion: 2 };
    expect(expectError(JSON.stringify(file))).toEqual({ code: 'unsupported_version', version: 2 });
  });

  it('スキーマに合わないデータは invalid_schema で、場所が分かる', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    const broken = { ...file, shots: [{ ...file.shots[0], result: 'unknown' }] };
    const error = expectError(JSON.stringify(broken));
    expect(error.code).toBe('invalid_schema');
    expect(error.code === 'invalid_schema' && error.issues[0]).toContain('shots.0.result');
  });

  it('結果とコースの組み合わせが不正なシュートは invalid_schema', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    const broken = { ...file, shots: [{ ...file.shots[0], result: 'miss', goalCell: 3 }] };
    expect(expectError(JSON.stringify(broken)).code).toBe('invalid_schema');
  });

  it('スクリプトなど未知のフィールドは取り除く', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    const withExtra = { ...file, goalkeepers: [{ ...file.goalkeepers[0], evil: '<script>' }] };
    const result = parseImportFile(JSON.stringify(withExtra));
    expect(result.ok && result.value.goalkeepers[0]).not.toHaveProperty('evil');
  });

  it('ファイル内で ID が重複していると invalid_schema', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    const duplicated = { ...file, shots: [...file.shots, file.shots[0]] };
    const error = expectError(JSON.stringify(duplicated));
    expect(error.code === 'invalid_schema' && error.issues[0]).toContain('重複');
  });
});

describe('migrateExportFile', () => {
  it('バージョン1はそのまま返す', () => {
    const raw = { schemaVersion: 1, app: 'handball_analysis' };
    expect(migrateExportFile(raw)).toEqual({ ok: true, value: raw });
  });

  it.each([0, 1.5, '1', undefined])('不正なバージョン %s は拒否する', (version) => {
    expect(migrateExportFile({ schemaVersion: version })).toEqual({
      ok: false,
      error: { code: 'unsupported_version', version },
    });
  });
});

describe('checkReferences', () => {
  it('参照先がファイル内にあれば成功する', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    expect(checkReferences(file, noExisting)).toEqual({ ok: true, value: undefined });
  });

  it('参照先が既存データにあれば成功する（試合単位のファイルを追加で取り込む場合など）', () => {
    const data = sampleData();
    const file: ExportFile = buildExportFile({ ...data, goalkeepers: [] }, 'match', NOW);
    const existing = { ...noExisting, goalkeeperIds: new Set(data.goalkeepers.map((g) => g.id)) };
    expect(checkReferences(file, existing).ok).toBe(true);
  });

  it('参照先がどこにもなければ broken_reference', () => {
    const file = buildExportFile({ ...sampleData(), goalkeepers: [] }, 'match', NOW);
    const result = checkReferences(file, noExisting);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('broken_reference');
  });

  it('シュートの試合が見つからない場合も broken_reference', () => {
    const file = buildExportFile({ ...sampleData(), matches: [], matchGoalkeepers: [] }, 'goalkeeper', NOW);
    const result = checkReferences(file, noExisting);
    expect(!result.ok && result.error.code === 'broken_reference' && result.error.details[0]).toContain('試合');
  });
});

describe('buildImportPreview', () => {
  it('件数と、既存データと ID が重なる件数を返す', () => {
    const file = buildExportFile(sampleData(), 'all', NOW);
    const existing: ExistingIds = {
      ...noExisting,
      goalkeeperIds: new Set([file.goalkeepers[0]?.id ?? '']),
      shotIds: new Set([file.shots[0]?.id ?? '', 'unrelated']),
    };
    expect(buildImportPreview(file, existing)).toEqual({
      counts: { goalkeepers: 1, matches: 1, shots: 3 },
      conflicts: { goalkeepers: 1, matches: 0, shots: 1 },
    });
  });
});

describe('importErrorMessage', () => {
  it.each<ImportError>([
    { code: 'too_large' },
    { code: 'invalid_json' },
    { code: 'not_app_file' },
    { code: 'unsupported_version', version: 2 },
    { code: 'unsupported_version', version: 0 },
    { code: 'invalid_schema', issues: [] },
    { code: 'broken_reference', details: [] },
  ])('%o に対して、どうすればよいかを含む文言を返す', (error) => {
    expect(importErrorMessage(error)).toMatch(/ください|取り込めません/);
  });

  it('新しいバージョンと古いバージョンで文言を分ける', () => {
    expect(importErrorMessage({ code: 'unsupported_version', version: 2 })).toContain('新しいバージョン');
    expect(importErrorMessage({ code: 'unsupported_version', version: 0 })).not.toContain('新しいバージョン');
  });
});
