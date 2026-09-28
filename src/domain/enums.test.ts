import { describe, expect, it } from 'vitest';
import { shotResultLabels, shotResults, toOptions, zoneLabels } from './enums';

describe('enums', () => {
  it('値と表示名から選択肢を作る', () => {
    expect(toOptions(shotResults, shotResultLabels)).toEqual([
      { value: 'goal', label: '失点' },
      { value: 'save', label: 'セーブ' },
      { value: 'post', label: 'ポスト・バー' },
      { value: 'miss', label: '枠外' },
      { value: 'blocked', label: 'DFブロック' },
    ]);
  });

  it('シュート位置の表示名が用語集と一致する（glossary.md 3.1）', () => {
    expect(zoneLabels).toEqual({
      lw: 'レフトウイング',
      lb: 'レフトバック',
      cb: 'センター',
      rb: 'ライトバック',
      rw: 'ライトウイング',
      pivot_l: '6m左',
      pivot_c: '6m中央',
      pivot_r: '6m右',
      seven_m: '7mスロー',
      fast_break: '速攻',
      long: 'ロングシュート',
    });
  });
});
