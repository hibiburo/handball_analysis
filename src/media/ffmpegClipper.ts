import type { FFmpeg } from '@ffmpeg/ffmpeg';

/**
 * ffmpeg.wasm で動画ファイルから区間を切り抜く（.steering/20261003-scene-mp4-export）。
 * 変換はすべてブラウザの中（Web Worker）で行い、動画ファイルを外部に送信しない。
 */

const INPUT_DIR = '/input';
const OUTPUT_FILE = 'clip.mp4';

export type ClipRequest = {
  /** 開始位置（秒） */
  start: number;
  /** 長さ（秒） */
  duration: number;
};

export type Clipper = {
  /** ffmpeg.wasm を読み込む（初回のみ時間がかかる） */
  load(signal?: AbortSignal): Promise<void>;
  /** 動画ファイルを読めるようにする。ファイル全体はメモリに読み込まない（WORKERFS） */
  mount(file: File): Promise<void>;
  /** マウント中のファイルから区間を切り抜いた MP4 を返す */
  clip(request: ClipRequest, signal?: AbortSignal): Promise<Uint8Array>;
  unmount(): Promise<void>;
  /** Worker を終了する（中止したとき）。次に使うときは load から */
  terminate(): void;
};

/**
 * 切り抜きの ffmpeg の引数。
 * 再エンコードしない（-c copy）ので速いが、開始はその前のキーフレームからになる（前余白があるため、シーンは欠けない）。
 * HEVC の映像は、iPhone で再生できるよう hvc1 のタグを付ける。
 */
export function buildClipArgs(input: string, { start, duration }: ClipRequest, isHevc: boolean): string[] {
  return [
    '-ss',
    start.toFixed(1),
    '-i',
    input,
    '-t',
    duration.toFixed(1),
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-c',
    'copy',
    ...(isHevc ? ['-tag:v', 'hvc1'] : []),
    '-avoid_negative_ts',
    'make_zero',
    '-movflags',
    '+faststart',
    '-sn',
    '-dn',
    '-y',
    OUTPUT_FILE,
  ];
}

/** ffmpeg の出力（ログ）から、最初の映像が HEVC かどうかを判定する */
export function isHevcFromLog(log: string): boolean {
  return /Stream #\d+:\d+[^:]*: Video: (hevc|h265)/i.test(log);
}

export function createClipper(): Clipper {
  let ffmpeg: FFmpeg | null = null;
  let input: string | null = null;
  let isHevc = false;
  let log = '';

  function requireFFmpeg(): FFmpeg {
    if (!ffmpeg) throw new Error('ffmpeg.wasm が読み込まれていません');
    return ffmpeg;
  }

  return {
    async load(signal) {
      if (ffmpeg) return;
      // 初回表示を遅くしないよう、使うときに初めて読み込む。本体はアプリと同じオリジンから配信する（外部の CDN を使わない）
      const [{ FFmpeg }, { default: coreURL }, { default: wasmURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/core?url'),
        import('@ffmpeg/core/wasm?url'),
      ]);
      const instance = new FFmpeg();
      instance.on('log', ({ message }) => {
        log += `${message}\n`;
      });
      await instance.load({ coreURL, wasmURL }, signal ? { signal } : {});
      ffmpeg = instance;
    },

    async mount(file) {
      const instance = requireFFmpeg();
      const { FFFSType } = await import('@ffmpeg/ffmpeg');
      await instance.createDir(INPUT_DIR);
      await instance.mount(FFFSType.WORKERFS, { files: [file] }, INPUT_DIR);
      input = `${INPUT_DIR}/${file.name}`;
      // 出力ファイルを指定せずに実行すると ffmpeg はエラーで終わるが、入力の情報がログに出る
      log = '';
      await instance.exec(['-hide_banner', '-i', input]);
      isHevc = isHevcFromLog(log);
    },

    async clip(request, signal) {
      const instance = requireFFmpeg();
      if (!input) throw new Error('動画ファイルがマウントされていません');
      log = '';
      const code = await instance.exec(buildClipArgs(input, request, isHevc), -1, signal ? { signal } : {});
      if (code !== 0) throw new Error(`切り抜きに失敗しました（${code}）: ${log.split('\n').slice(-5).join(' ')}`);
      const data = await instance.readFile(OUTPUT_FILE);
      await instance.deleteFile(OUTPUT_FILE);
      if (typeof data === 'string') throw new Error('切り抜いたファイルを読み込めませんでした');
      return data;
    },

    async unmount() {
      const instance = requireFFmpeg();
      if (!input) return;
      await instance.unmount(INPUT_DIR);
      await instance.deleteDir(INPUT_DIR);
      input = null;
    },

    terminate() {
      ffmpeg?.terminate();
      ffmpeg = null;
      input = null;
    },
  };
}
