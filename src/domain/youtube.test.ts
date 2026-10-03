import { describe, expect, it } from 'vitest';
import { buildYouTubeWatchUrl, parseYouTubeVideoId } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('buildYouTubeWatchUrl', () => {
  it('開始位置を指定した視聴リンクを作る', () => {
    expect(buildYouTubeWatchUrl({ videoId: ID, start: 1417 })).toBe(`https://youtu.be/${ID}?t=1417`);
  });

  it('開始位置は切り捨てて、シーンを欠けさせない', () => {
    expect(buildYouTubeWatchUrl({ videoId: ID, start: 1417.9 })).toBe(`https://youtu.be/${ID}?t=1417`);
  });

  it('開始位置は0秒より前にしない', () => {
    expect(buildYouTubeWatchUrl({ videoId: ID, start: -2 })).toBe(`https://youtu.be/${ID}?t=0`);
  });

  it('作ったリンクは動画IDの解析で元の動画IDに戻る', () => {
    expect(parseYouTubeVideoId(buildYouTubeWatchUrl({ videoId: ID, start: 30 }))).toEqual({ ok: true, value: ID });
  });
});

describe('parseYouTubeVideoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/live/${ID}`,
  ])('%s から動画IDを取り出す', (url) => {
    expect(parseYouTubeVideoId(url)).toEqual({ ok: true, value: ID });
  });

  it('時刻指定などの余分なパラメータは無視する', () => {
    expect(parseYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}&t=120s&list=abc`)).toEqual({
      ok: true,
      value: ID,
    });
    expect(parseYouTubeVideoId(`https://youtu.be/${ID}?si=xyz&t=30`)).toEqual({ ok: true, value: ID });
  });

  it('前後の空白を取り除いてから解析する', () => {
    expect(parseYouTubeVideoId(`  https://youtu.be/${ID}  `)).toEqual({ ok: true, value: ID });
  });

  it.each([
    ['URLでない文字列', 'youtube'],
    ['YouTube 以外のサイト', `https://example.com/watch?v=${ID}`],
    ['動画IDが11文字でない', 'https://www.youtube.com/watch?v=short'],
    ['動画IDに使えない文字を含む', 'https://www.youtube.com/watch?v=dQw4w9WgXc!'],
    ['動画IDがない', 'https://www.youtube.com/watch'],
    ['チャンネルページ', 'https://www.youtube.com/@channel'],
    ['http/https 以外', `javascript:alert(1)//youtu.be/${ID}`],
    ['youtu.be に動画IDがない', 'https://youtu.be/'],
  ])('%s はエラーになる', (_, url) => {
    expect(parseYouTubeVideoId(url)).toEqual({ ok: false, error: 'invalid_url' });
  });
});
