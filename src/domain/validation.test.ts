import { describe, expect, it } from 'vitest';
import type { ShotDraft } from './types';
import {
  clearDisallowedFields,
  isGoalCellAllowed,
  isGoalCellRequired,
  isGoalkeeperActionAllowed,
  validateShotInput,
} from './validation';

const MATCH_ID = '00000000-0000-4000-8000-000000000001';
const GOALKEEPER_ID = '00000000-0000-4000-8000-000000000002';

function draft(overrides: Partial<ShotDraft> = {}): ShotDraft {
  return {
    matchId: MATCH_ID,
    goalkeeperId: GOALKEEPER_ID,
    zone: 'lb',
    result: 'goal',
    goalCell: 1,
    videoTime: 83.27,
    ...overrides,
  };
}

function errorFields(input: ShotDraft, options = {}) {
  const result = validateShotInput(input, options);
  return result.ok ? [] : result.error.map((e) => `${e.field}:${e.code}`);
}

describe('結果ごとの入力可否', () => {
  it('コースは失点とセーブで必須になる（V2）', () => {
    expect(isGoalCellRequired('goal')).toBe(true);
    expect(isGoalCellRequired('save')).toBe(true);
    expect(isGoalCellRequired('post')).toBe(false);
    expect(isGoalCellRequired(undefined)).toBe(false);
  });

  it('コースは枠外とDFブロックでは入力できない（V3・V4）', () => {
    expect(isGoalCellAllowed('post')).toBe(true);
    expect(isGoalCellAllowed('miss')).toBe(false);
    expect(isGoalCellAllowed('blocked')).toBe(false);
  });

  it('GKの対応はセーブのときだけ入力できる（V5）', () => {
    expect(isGoalkeeperActionAllowed('save')).toBe(true);
    expect(isGoalkeeperActionAllowed('goal')).toBe(false);
    expect(isGoalkeeperActionAllowed(undefined)).toBe(false);
  });
});

describe('validateShotInput', () => {
  it('必須項目が揃っていれば保存できる形を返し、動画時刻を小数第1位に丸める', () => {
    const result = validateShotInput(draft({ memo: '  速いシュート  ' }));
    expect(result).toEqual({
      ok: true,
      value: {
        matchId: MATCH_ID,
        goalkeeperId: GOALKEEPER_ID,
        zone: 'lb',
        result: 'goal',
        goalCell: 1,
        videoTime: 83.3,
        memo: '速いシュート',
      },
    });
  });

  it('担当GK・シュート位置・結果・動画時刻がないとエラーになる（V1）', () => {
    const input: ShotDraft = { matchId: MATCH_ID };
    expect(errorFields(input)).toEqual([
      'goalkeeperId:required',
      'zone:required',
      'result:required',
      'videoTime:required',
    ]);
  });

  it('失点でコースがないとエラーになる（V2）', () => {
    expect(errorFields(draft({ result: 'goal', goalCell: undefined }))).toEqual(['goalCell:required']);
  });

  it('ポスト・バーはコースがなくても保存できる（V3）', () => {
    expect(errorFields(draft({ result: 'post', goalCell: undefined }))).toEqual([]);
  });

  it('枠外でコースを入力しているとエラーになる（V4）', () => {
    expect(errorFields(draft({ result: 'miss', goalCell: 3 }))).toEqual(['goalCell:not_allowed']);
  });

  it('セーブ以外でGKの対応を入力しているとエラーになる（V5）', () => {
    expect(errorFields(draft({ result: 'goal', goalkeeperAction: 'hand' }))).toEqual(['goalkeeperAction:not_allowed']);
    expect(errorFields(draft({ result: 'save', goalkeeperAction: 'hand' }))).toEqual([]);
  });

  it('動画時刻が負の値や動画の長さを超える値だとエラーになる（V6）', () => {
    expect(errorFields(draft({ videoTime: -1 }))).toEqual(['videoTime:out_of_range']);
    expect(errorFields(draft({ videoTime: 3601 }), { videoDuration: 3600 })).toEqual(['videoTime:out_of_range']);
    expect(errorFields(draft({ videoTime: Number.NaN }))).toEqual(['videoTime:out_of_range']);
    expect(errorFields(draft({ videoTime: 3600 }), { videoDuration: 3600 })).toEqual([]);
  });

  it('動画の長さが分からない（0）ときは上限を確認しない', () => {
    expect(errorFields(draft({ videoTime: 99999 }), { videoDuration: 0 })).toEqual([]);
  });

  it('メモが500文字を超えるとエラーになる（V7）', () => {
    expect(errorFields(draft({ memo: 'あ'.repeat(501) }))).toEqual(['memo:too_long']);
    expect(errorFields(draft({ memo: 'あ'.repeat(500) }))).toEqual([]);
  });

  it('任意項目は入力されたものだけを含め、空白だけのメモは含めない', () => {
    const result = validateShotInput(
      draft({
        id: 'existing-id',
        result: 'save',
        goalkeeperAction: 'foot',
        half: 2,
        gameMinute: 41,
        shotType: 'jump',
        shooterHand: 'left',
        shooterPosition: 'LB',
        situation: 'power_play',
        memo: '   ',
      }),
    );
    expect(result.ok && result.value).toEqual({
      id: 'existing-id',
      matchId: MATCH_ID,
      goalkeeperId: GOALKEEPER_ID,
      zone: 'lb',
      result: 'save',
      goalCell: 1,
      goalkeeperAction: 'foot',
      videoTime: 83.3,
      half: 2,
      gameMinute: 41,
      shotType: 'jump',
      shooterHand: 'left',
      shooterPosition: 'LB',
      situation: 'power_play',
    });
  });
});

describe('clearDisallowedFields', () => {
  it('結果を枠外にするとコースとGKの対応を消す', () => {
    expect(clearDisallowedFields(draft({ result: 'miss', goalCell: 2, goalkeeperAction: 'hand' }))).toEqual(
      draft({ result: 'miss', goalCell: undefined, goalkeeperAction: undefined }),
    );
  });

  it('結果をセーブから失点にするとGKの対応だけを消す', () => {
    const next = clearDisallowedFields(draft({ result: 'goal', goalCell: 5, goalkeeperAction: 'body' }));
    expect(next.goalCell).toBe(5);
    expect('goalkeeperAction' in next).toBe(false);
  });
});
