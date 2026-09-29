export type PlayerState = 'unstarted' | 'playing' | 'paused' | 'buffering' | 'ended' | 'cued';

export type PlayerError = 'invalid_video' | 'not_found' | 'embed_not_allowed' | 'unknown';

export type LoadVideoParams = {
  videoId: string;
  /** 再生開始位置（秒） */
  start?: number;
  /** 再生終了位置（秒）。指定するとその位置で停止し、状態が ended になる */
  end?: number;
  /** false の場合は読み込むだけで再生しない */
  autoplay?: boolean;
};

/**
 * 動画プレーヤーの操作（design.md 2.3）。
 * 画面はこのインターフェースだけを使い、テストではモック実装に差し替える。
 */
export interface VideoPlayer {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  loadVideo(params: LoadVideoParams): void;
  onStateChange(listener: (state: PlayerState) => void): () => void;
  onError(listener: (error: PlayerError) => void): () => void;
  destroy(): void;
}

/** プレーヤーを作る関数。準備が完了したら resolve する */
export type VideoPlayerFactory = (element: HTMLElement, params: LoadVideoParams) => Promise<VideoPlayer>;

declare global {
  interface Window {
    /** E2E テストで YouTube の代わりに使うプレーヤー（Playwright の addInitScript で注入する） */
    __E2E_VIDEO_PLAYER_FACTORY__?: VideoPlayerFactory;
    /** YouTube IFrame API の読み込み完了時に呼ばれる */
    onYouTubeIframeAPIReady?: () => void;
  }
}
