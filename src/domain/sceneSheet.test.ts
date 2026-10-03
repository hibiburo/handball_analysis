import { describe, expect, it } from 'vitest';
import { buildShot } from '@/test/factories';
import { buildSceneSheetFileName, buildSceneSheetRows, SCENE_SHEET_HEADERS } from './sceneSheet';

describe('buildSceneSheetRows', () => {
  it('シュート種別と、記録時刻の前余白前・後余白後の時間を出力する', () => {
    const shot = buildShot({ videoTime: 1421.3, shotType: 'cut_in' });
    expect(buildSceneSheetRows({ shots: [shot], preSeconds: 4, postSeconds: 3 })).toEqual([
      { shotType: 'カットイン', start: '23:37', end: '23:44' },
    ]);
  });

  it('シュート種別が未入力なら空にする', () => {
    const shot = buildShot({ videoTime: 60 });
    expect(buildSceneSheetRows({ shots: [shot], preSeconds: 4, postSeconds: 3 })[0]?.shotType).toBe('');
  });

  it('前余白・後余白の設定に従い、開始は0秒より前にしない', () => {
    expect(buildSceneSheetRows({ shots: [buildShot({ videoTime: 60 })], preSeconds: 10, postSeconds: 5 })).toEqual([
      { shotType: '', start: '0:50', end: '1:05' },
    ]);
    expect(
      buildSceneSheetRows({ shots: [buildShot({ videoTime: 2 })], preSeconds: 4, postSeconds: 3 })[0],
    ).toMatchObject({
      start: '0:00',
      end: '0:05',
    });
  });

  it('1時間以上は h:mm:ss で表す', () => {
    const [row] = buildSceneSheetRows({ shots: [buildShot({ videoTime: 3601 })], preSeconds: 4, postSeconds: 3 });
    expect(row).toMatchObject({ start: '59:57', end: '1:00:04' });
  });

  it('渡された順番のまま出力する', () => {
    const shots = [buildShot({ videoTime: 300, shotType: 'side' }), buildShot({ videoTime: 100, shotType: 'pivot' })];
    expect(buildSceneSheetRows({ shots, preSeconds: 4, postSeconds: 3 }).map((r) => r.shotType)).toEqual([
      'サイドシュート',
      'ポスト',
    ]);
  });

  it('見出しは3列', () => {
    expect(SCENE_SHEET_HEADERS).toEqual(['シュート種別', '動画開始時間', '動画終了時間']);
  });
});

describe('buildSceneSheetFileName', () => {
  it('GK名と日付からファイル名を作る', () => {
    expect(buildSceneSheetFileName('山田太郎', '2026-10-03')).toBe('handball_analysis_scenes_山田太郎_20261003.xlsx');
  });
});
