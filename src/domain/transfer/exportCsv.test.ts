import { describe, expect, it } from 'vitest';
import { planClips } from '@/domain/clips';
import { buildMatch, buildShot } from '@/test/factories';
import { buildClipIndexCsv, CLIP_INDEX_HEADERS, toCsv } from './exportCsv';

const BOM = '\uFEFF';

describe('toCsv', () => {
  it('BOM を付け、行は CRLF で区切る', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd'],
      ]),
    ).toBe(`${BOM}a,b\r\nc,d\r\n`);
  });

  it('カンマ・ダブルクォート・改行を含む値は囲み、ダブルクォートは二重にする', () => {
    expect(toCsv([['a,b', 'say "hi"', 'line1\nline2']])).toBe(`${BOM}"a,b","say ""hi""","line1\nline2"\r\n`);
  });

  it.each(['=SUM(A1)', '+1', '-1', '@cmd', '\tx'])("数式として実行されうる値 %j は先頭に ' を付ける", (value) => {
    expect(toCsv([[value]])).toBe(`${BOM}'${value}\r\n`);
  });
});

describe('buildClipIndexCsv', () => {
  const match = buildMatch({ date: '2026-09-20', homeTeam: '○○大学', awayTeam: '□□大学', competition: '秋季リーグ' });
  const matchesById = new Map([[match.id, match]]);

  function rows(csv: string): string[][] {
    return csv
      .replace(BOM, '')
      .trimEnd()
      .split('\r\n')
      .map((line) => line.split(','));
  }

  it('1行目に列名、各行にファイル名とシーンの情報を出力する', () => {
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
    const csv = buildClipIndexCsv(planClips({ shots: [shot], matchesById, preSeconds: 4, postSeconds: 3 }));
    expect(rows(csv)).toEqual([
      [...CLIP_INDEX_HEADERS],
      [
        '20260920_23m41s_レフトバック_コース1_セーブ.mp4',
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
      ],
    ]);
  });

  it('未入力の任意項目は空にする', () => {
    const shot = buildShot({ matchId: match.id, videoTime: 60, zone: 'rw', result: 'miss', goalCell: undefined });
    const row = rows(buildClipIndexCsv(planClips({ shots: [shot], matchesById, preSeconds: 4, postSeconds: 3 })))[1];
    expect(row?.slice(5)).toEqual(['ライトウイング', '', '', '枠外', '', '', '', '', '', '']);
  });
});
