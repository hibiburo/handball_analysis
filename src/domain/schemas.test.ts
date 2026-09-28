import { describe, expect, it } from 'vitest';
import { buildGoalkeeper, buildMatch, buildShot } from '@/test/factories';
import { goalkeeperSchema, matchSchema, shotSchema } from './schemas';

describe('shotSchema', () => {
  it('正しいシュートを受け付ける', () => {
    expect(shotSchema.safeParse(buildShot({ result: 'save', goalkeeperAction: 'hand' })).success).toBe(true);
  });

  it('失点でコースがないシュートを拒否する（V2）', () => {
    const result = shotSchema.safeParse(buildShot({ result: 'goal', goalCell: undefined }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['goalCell']);
  });

  it('DFブロックでコースがあるシュートを拒否する（V4）', () => {
    expect(shotSchema.safeParse(buildShot({ result: 'blocked', goalCell: 2 })).success).toBe(false);
  });

  it('失点でGKの対応があるシュートを拒否する（V5）', () => {
    const result = shotSchema.safeParse(buildShot({ result: 'goal', goalkeeperAction: 'foot' }));
    expect(result.error?.issues[0]?.path).toEqual(['goalkeeperAction']);
  });

  it('コースが1〜9以外のシュートを拒否する', () => {
    expect(shotSchema.safeParse({ ...buildShot(), goalCell: 10 }).success).toBe(false);
  });
});

describe('goalkeeperSchema / matchSchema', () => {
  it('名前の前後の空白を取り除き、空の名前は拒否する', () => {
    expect(goalkeeperSchema.parse(buildGoalkeeper({ name: '  山田  ' })).name).toBe('山田');
    expect(goalkeeperSchema.safeParse(buildGoalkeeper({ name: '   ' })).success).toBe(false);
  });

  it('名前は50文字まで', () => {
    expect(goalkeeperSchema.safeParse(buildGoalkeeper({ teamName: 'あ'.repeat(51) })).success).toBe(false);
  });

  it('不正な動画IDの試合を拒否する', () => {
    expect(matchSchema.safeParse(buildMatch({ youtubeVideoId: '<script>' })).success).toBe(false);
  });

  it('日付は YYYY-MM-DD 形式のみ受け付ける', () => {
    expect(matchSchema.safeParse(buildMatch({ date: '2026/09/20' })).success).toBe(false);
  });
});
