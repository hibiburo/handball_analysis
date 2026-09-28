import { err, ok, type Result } from '@/lib/result';

/** YouTube の動画ID（11文字）の形式 */
export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com']);
const SHORT_HOST = 'youtu.be';
/** パスの先頭に動画IDが続く形式（/shorts/{id}、/embed/{id}、/live/{id}） */
const PATH_PREFIXES = ['shorts', 'embed', 'live'];

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
