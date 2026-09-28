/** 現在日時を ISO 8601 文字列（UTC）で返す */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 動画時刻を小数第1位に丸める。
 * getCurrentTime() には 0.1〜0.25 秒程度の誤差があるため、それより細かい値は保存しない（architecture.md 3.1）。
 */
export function roundVideoTime(seconds: number): number {
  return Math.round(seconds * 10) / 10;
}

/** 秒を「m:ss」（1時間以上は「h:mm:ss」）の表示にする。小数は切り捨てる */
export function formatVideoTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  }
  return `${m}:${ss}`;
}

/** 2つの日時の差を日数（切り捨て）で返す */
export function daysBetween(fromIso: string, to: Date): number {
  const diffMs = to.getTime() - new Date(fromIso).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/** 今日の日付を YYYY-MM-DD（端末のタイムゾーン）で返す。ファイル名や試合日の初期値に使う */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
