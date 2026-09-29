const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api';

let loading: Promise<typeof YT> | null = null;

/**
 * YouTube IFrame Player API のスクリプトを読み込む。
 * 初回のプレーヤー表示時に1回だけ読み込み、アプリ起動時には読み込まない（architecture.md 3.1）。
 */
export function loadYouTubeApi(): Promise<typeof YT> {
  if (loading) return loading;

  loading = new Promise<typeof YT>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = YOUTUBE_API_SRC;
    script.async = true;
    script.onerror = () => {
      // 読み込みに失敗したら、次回の呼び出しで再試行できるようにする
      loading = null;
      script.remove();
      reject(new Error('YouTube の読み込みに失敗しました'));
    };
    document.head.append(script);
  });
  return loading;
}
