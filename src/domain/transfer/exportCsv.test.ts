import { describe, expect, it } from 'vitest';
import { buildMatch, buildShot } from '@/test/factories';
import { buildSceneCsv, buildSceneCsvFileName, SCENE_CSV_HEADERS, toCsv } from './exportCsv';

/** BOM と末尾の改行を除いて、行・列に分ける（テスト用。値にカンマや改行を含まない場合のみ） */
function parse(csv: string): string[][] {
  return csv
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split('\r\n')
    .map((line) => line.split(','));
}

describe('toCsv', () => {
  it('BOM を付け、行は CRLF で区切る', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    ).toBe('\uFEFFa,b\r\nc,d\r\n');
  });

  it('カンマ・ダブルクォート・改行を含む値は囲み、ダブルクォートは二重にする', () => {
    expect(toCsv([['a,b', 'say "hi"', 'line1\nline2']])).toBe('\uFEFF"a,b","say ""hi""","line1\nline2"\r\n');
  });

  it.each(['=SUM(A1)', '+1', '-1', '@cmd', '\tx'])("数式として実行されうる値 %j は先頭に ' を付ける", (value) => {
    expect(toCsv([[value]])).toBe(`\uFEFF'${value}\r\n`);
  });

  it('URL はそのまま出力する', () => {
    expect(toCsv([['https://www.youtube.com/embed/x?start=1&end=2']])).toBe(
      '\uFEFFhttps://www.youtube.com/embed/x?start=1&end=2\r\n',
    );
  });
});

describe('buildSceneCsv', () => {
  const match = buildMatch({
    date: '2026-09-20',
    homeTeam: '○○大学',
    awayTeam: '□□大学',
    competition: '秋季リーグ',
    youtubeVideoId: 'dQw4w9WgXcQ',
  });
  const matchesById = new Map([[match.id, match]]);

  it('1行目に列名、各行に表示名と動画リンクを出力する', () => {
    const shot = buildShot({
      matchId: match.id,
      videoTime: 1421.3,
      zone: 'lb',
      shotType: 'cut_in',
      goalCell: 1,
      result: 'save',
      goalkeeperAction: 'hand',
      shooterHand: 'left',
      shooterPosition: 'LB',
      situation: 'even',
      half: 2,
      memo: '速い',
    });
    const rows = parse(buildSceneCsv({ shots: [shot], matchesById, preSeconds: 4 }));
    expect(rows[0]).toEqual([...SCENE_CSV_HEADERS]);
    expect(rows[1]).toEqual([
      '2026/09/20',
      '○○大学 vs □□大学',
      '秋季リーグ',
      '23:41',
      'レフトバック',
      'カットイン',
      'コース1',
      'セーブ',
      '手',
      '左',
      'LB',
      '同数',
      '後半',
      '速い',
      'https://youtu.be/dQw4w9WgXcQ?t=1417',
    ]);
  });

  it('未入力の任意項目は空にする', () => {
    const shot = buildShot({ matchId: match.id, videoTime: 60, zone: 'rw', result: 'miss', goalCell: undefined });
    const row = parse(buildSceneCsv({ shots: [shot], matchesById, preSeconds: 4 }))[1];
    expect(row?.slice(4, 14)).toEqual(['ライトウイング', '', '', '枠外', '', '', '', '', '', '']);
  });

  it('前余白の設定に従ってリンクの開始位置を変え、開始は0秒より前にしない', () => {
    const link = (videoTime: number, pre: number) =>
      parse(
        buildSceneCsv({ shots: [buildShot({ matchId: match.id, videoTime })], matchesById, preSeconds: pre }),
      )[1]?.at(-1);
    expect(link(60, 4)).toBe('https://youtu.be/dQw4w9WgXcQ?t=56');
    expect(link(60, 10)).toBe('https://youtu.be/dQw4w9WgXcQ?t=50');
    expect(link(2, 4)).toBe('https://youtu.be/dQw4w9WgXcQ?t=0');
  });

  it('渡された順番のまま出力し、シーンがなければ列名だけにする', () => {
    const a = buildShot({ matchId: match.id, videoTime: 300 });
    const b = buildShot({ matchId: match.id, videoTime: 100 });
    const rows = parse(buildSceneCsv({ shots: [a, b], matchesById, preSeconds: 4 }));
    expect(rows.slice(1).map((row) => row[3])).toEqual(['5:00', '1:40']);
    expect(parse(buildSceneCsv({ shots: [], matchesById, preSeconds: 4 }))).toHaveLength(1);
  });

  it('試合が見つからない場合は、試合の列とリンクを空にする', () => {
    const shot = buildShot({ matchId: 'missing', videoTime: 10 });
    const row = parse(buildSceneCsv({ shots: [shot], matchesById, preSeconds: 4 }))[1];
    expect(row?.slice(0, 3)).toEqual(['', '', '']);
    expect(row?.at(-1)).toBe('');
  });
});

describe('buildSceneCsvFileName', () => {
  it('GK名と日付からファイル名を作る', () => {
    expect(buildSceneCsvFileName('山田太郎', '2026-10-03')).toBe('handball_analysis_scenes_山田太郎_20261003.csv');
  });
});
