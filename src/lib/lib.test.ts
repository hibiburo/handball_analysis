import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile, sanitizeFilename } from './download';
import { createId } from './id';
import { err, ok } from './result';
import { daysBetween, formatVideoTime, nowIso, roundVideoTime, todayLocalDate } from './time';

describe('time', () => {
  it('動画時刻を小数第1位に丸める', () => {
    expect(roundVideoTime(83.27)).toBe(83.3);
    expect(roundVideoTime(83.24)).toBe(83.2);
    expect(roundVideoTime(0)).toBe(0);
  });

  it('秒を m:ss で表示し、1時間以上は h:mm:ss にする', () => {
    expect(formatVideoTime(0)).toBe('0:00');
    expect(formatVideoTime(83.9)).toBe('1:23');
    expect(formatVideoTime(1421)).toBe('23:41');
    expect(formatVideoTime(3725)).toBe('1:02:05');
    expect(formatVideoTime(-5)).toBe('0:00');
  });

  it('日数の差を切り捨てで返す', () => {
    expect(daysBetween('2026-09-21T00:00:00.000Z', new Date('2026-09-28T00:00:00.000Z'))).toBe(7);
    expect(daysBetween('2026-09-21T12:00:00.000Z', new Date('2026-09-28T00:00:00.000Z'))).toBe(6);
  });

  it('今日の日付を YYYY-MM-DD で返す', () => {
    expect(todayLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('現在日時を ISO 8601 で返す', () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('id', () => {
  it('UUID 形式の ID を毎回異なる値で作る', () => {
    const a = createId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(createId()).not.toBe(a);
  });
});

describe('result', () => {
  it('成功と失敗を表す', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('x')).toEqual({ ok: false, error: 'x' });
  });
});

describe('download', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('ファイル名に使えない文字と空白を取り除く', () => {
    expect(sanitizeFilename('山田 太郎/○○大:#1?')).toBe('山田太郎○○大#1');
    expect(sanitizeFilename('あ'.repeat(60))).toHaveLength(50);
  });

  it('リンクを作ってクリックし、あとで URL を解放する', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('a.json', '{}', 'application/json');

    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
