import { err, ok, type Result } from '@/lib/result';

/** YouTube の動画ID（11文字）の形式 */
export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com']);
const SHORT_HOST = 'youtu.be';
/** パスの先頭に動画IDが続く形式（/shorts/{id}、/embed/{id}、/live/{id}） */
const PATH_PREFIXES = ['shorts', 'embed', 'live'];

/**
 * 指定した位置から再生する YouTube の視聴リンクを作る（.steering/20261003-scene-link-csv）。
 * 動画ファイルは作らず、再生位置を指定するだけにする（YouTube の利用規約のため）。
 *
 * 範囲（start・end）を指定できる埋め込み用の URL（/embed/）は、参照元（Referer）なしで直接開くと
 * YouTube が「エラー 153」を返して再生できないため、共有用には使わない。
 * 通常の視聴リンクは、スマホでは YouTube アプリで開き、指定した位置から再生される（終了位置では止まらない）。
 * 開始位置は整数秒にし、シーンが欠けないよう切り捨てる。
 */
export function buildYouTubeWatchUrl({ videoId, start }: { videoId: string; start: number }): string {
  const startSeconds = Math.max(0, Math.floor(start));
  return `https://youtu.be/${encodeURIComponent(videoId)}?t=${startSeconds}`;
}

/**
 * YouTube の URL から動画IDを取り出す（functional-design.md 5.6）。
 * 取り出したIDは形式を検証し、埋め込みには検証済みのIDのみを使う（architecture.md 4章）。
 */
export function parseYouTubeVideoId(input: string): Result<string, 'invalid_url'> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return err('invalid_url');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return err('invalid_url');
  }

  let candidate: string | null | undefined;
  const segments = url.pathname.split('/').filter(Boolean);

  if (url.hostname === SHORT_HOST) {
    candidate = segments[0];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (segments[0] === 'watch') {
      candidate = url.searchParams.get('v');
    } else if (segments[0] !== undefined && PATH_PREFIXES.includes(segments[0])) {
      candidate = segments[1];
    }
  }

  if (candidate && YOUTUBE_VIDEO_ID_PATTERN.test(candidate)) {
    return ok(candidate);
  }
  return err('invalid_url');
}
