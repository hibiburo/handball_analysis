import { describe, expect, it } from 'vitest';
// Node の API を使わずに用語集を読み込む（アプリの型設定にはブラウザの型だけを入れているため）
import glossary from '../../docs/glossary.md?raw';
import {
  goalCellLabels,
  goalkeeperActionLabels,
  handednessLabels,
  shooterPositionLabels,
  shotResultLabels,
  shotTypeLabels,
  situationLabels,
  zoneLabels,
} from './enums';

/**
 * 画面の表示名が用語集（docs/glossary.md 3章）と一致していることを確かめる（AC11）。
 * 用語集の表の「| `コード値` | 表示名 |」の行を読み取り、コードの表示名と比べる。
 */
function glossaryLabels(heading: string): Record<string, string> {
  const start = glossary.indexOf(heading);
  if (start < 0) throw new Error(`用語集に「${heading}」がありません`);
  const next = glossary.indexOf('\n### ', start + heading.length);
  const section = glossary.slice(start, next < 0 ? undefined : next);
  const labels: Record<string, string> = {};
  for (const match of section.matchAll(/^\| `([^`]+)` \| ([^|]+?) \|/gm)) {
    const [, code, label] = match;
    if (code && label) labels[code] = label.trim();
  }
  return labels;
}

describe('用語集との一致（glossary.md 3章）', () => {
  it.each([
    ['### 3.1 シュート位置', zoneLabels],
    ['### 3.2 コース', goalCellLabels],
    ['### 3.3 シュート種別', shotTypeLabels],
    ['### 3.4 結果', shotResultLabels],
    ['### 3.5 GKの対応', goalkeeperActionLabels],
    ['### 3.6 利き手', handednessLabels],
    ['### 3.7 ポジション', shooterPositionLabels],
    ['### 3.8 数的状況', situationLabels],
  ] as const)('%s', (heading, labels) => {
    const expected = Object.fromEntries(Object.entries(labels).map(([code, label]) => [String(code), label]));
    expect(glossaryLabels(heading)).toEqual(expected);
  });
});
