import { describe, expect, it } from 'vitest';
import { buildMatch, buildShot } from '@/test/factories';
import { buildClipZipFileName, clipFileName, groupClipsByMatch, planClips } from './clips';

const match = buildMatch({ date: '2026-09-20' });
const other = buildMatch({ date: '2026-09-27' });
const matchesById = new Map([
  [match.id, match],
  [other.id, other],
]);

describe('clipFileName', () => {
  it('試合日・動画時刻・シュート位置・コース・結果からファイル名を作る', () => {
    const shot = buildShot({ matchId: match.id, videoTime: 1421.7, zone: 'lb', goalCell: 1, result: 'goal' });
    expect(clipFileName(shot, match)).toBe('20260920_23m41s_レフトバック_コース1_失点.mp4');
  });

  it('コースが未入力なら省き、1時間を超える時刻は分で表す', () => {
    const shot = buildShot({
      matchId: match.id,
      videoTime: 4503,
      zone: 'seven_m',
      result: 'miss',
      goalCell: undefined,
    });
    expect(clipFileName(shot, match)).toBe('20260920_75m03s_7mスロー_枠外.mp4');
  });
});

describe('planClips', () => {
  it('記録時刻の前余白〜後余白を切り抜く計画を作る', () => {
    const shot = buildShot({ matchId: match.id, videoTime: 100.3 });
    const [plan] = planClips({ shots: [shot], matchesById, preSeconds: 4, postSeconds: 3 });
    expect(plan).toMatchObject({ shot, match, start: 96.3, duration: 7 });
  });

  it('開始は0秒より前にせず、その分だけ短くする', () => {
    const shot = buildShot({ matchId: match.id, videoTime: 2.5 });
    const [plan] = planClips({ shots: [shot], matchesById, preSeconds: 4, postSeconds: 3 });
    expect(plan).toMatchObject({ start: 0, duration: 5.5 });
  });

  it('前余白・後余白の設定に従う', () => {
    const shot = buildShot({ matchId: match.id, videoTime: 60 });
    const [plan] = planClips({ shots: [shot], matchesById, preSeconds: 10, postSeconds: 5 });
    expect(plan).toMatchObject({ start: 50, duration: 15 });
  });

  it('同じファイル名が重なる場合は _2・_3 を付ける', () => {
    const shots = [0.1, 0.4, 0.8].map((d) =>
      buildShot({ matchId: match.id, videoTime: 60 + d, zone: 'cb', goalCell: 5, result: 'save' }),
    );
    expect(planClips({ shots, matchesById, preSeconds: 4, postSeconds: 3 }).map((p) => p.fileName)).toEqual([
      '20260920_01m00s_センター_コース5_セーブ.mp4',
      '20260920_01m00s_センター_コース5_セーブ_2.mp4',
      '20260920_01m00s_センター_コース5_セーブ_3.mp4',
    ]);
  });

  it('渡された順番を保ち、試合が見つからないシュートは除く', () => {
    const a = buildShot({ matchId: other.id, videoTime: 10 });
    const b = buildShot({ matchId: 'missing', videoTime: 20 });
    const c = buildShot({ matchId: match.id, videoTime: 30 });
    expect(planClips({ shots: [a, b, c], matchesById, preSeconds: 4, postSeconds: 3 }).map((p) => p.shot)).toEqual([
      a,
      c,
    ]);
  });
});

describe('buildClipZipFileName', () => {
  it('GK名と日付から zip のファイル名を作る', () => {
    expect(buildClipZipFileName('山田太郎', '2026-10-03')).toBe('handball_analysis_clips_山田太郎_20261003.zip');
  });
});

describe('groupClipsByMatch', () => {
  it('試合ごとにまとめ、最初に現れた順に並べる', () => {
    const shots = [
      buildShot({ matchId: match.id, videoTime: 10 }),
      buildShot({ matchId: other.id, videoTime: 20 }),
      buildShot({ matchId: match.id, videoTime: 30 }),
    ];
    const groups = groupClipsByMatch(planClips({ shots, matchesById, preSeconds: 4, postSeconds: 3 }));
    expect(groups.map((g) => [g.match.id, g.clips.length])).toEqual([
      [match.id, 2],
      [other.id, 1],
    ]);
  });
});
