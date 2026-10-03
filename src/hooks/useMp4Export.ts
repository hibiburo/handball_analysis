import { useCallback, useEffect, useRef, useState } from 'react';
import { buildClipZipFileName, CLIP_INDEX_FILE_NAME, groupClipsByMatch, type ClipPlan } from '@/domain/clips';
import { buildClipIndexCsv } from '@/domain/transfer/exportCsv';
import type { Goalkeeper } from '@/domain/types';
import { downloadBlob, sanitizeFilename } from '@/lib/download';
import { todayLocalDate } from '@/lib/time';
import { createZip, type ZipEntry } from '@/lib/zip';
import { createClipper, type Clipper } from '@/media/ffmpegClipper';

export type Mp4ExportStatus =
  | { kind: 'idle' }
  /** ffmpeg.wasm を読み込んでいる（初回のみ時間がかかる） */
  | { kind: 'loading' }
  | { kind: 'clipping'; done: number; total: number }
  | { kind: 'zipping' }
  | { kind: 'done'; count: number }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

type StartParams = {
  goalkeeper: Goalkeeper;
  /** 書き出すシーン（シーン一覧と同じ順番） */
  plans: readonly ClipPlan[];
  /** 試合ごとに選んだ元の動画ファイル。ファイルのない試合のシーンは書き出さない */
  filesByMatchId: ReadonlyMap<string, File>;
};

/**
 * シーンを MP4 に切り抜き、zip にまとめてダウンロードする（.steering/20261003-scene-mp4-export）。
 */
export function useMp4Export() {
  const [status, setStatus] = useState<Mp4ExportStatus>({ kind: 'idle' });
  const clipperRef = useRef<Clipper | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 画面を閉じたら、作成中の処理を止めて Worker を終了する
  useEffect(
    () => () => {
      abortRef.current?.abort();
      clipperRef.current?.terminate();
    },
    [],
  );

  const start = useCallback(async ({ goalkeeper, plans, filesByMatchId }: StartParams): Promise<Mp4ExportStatus> => {
    const finish = (next: Mp4ExportStatus) => {
      setStatus(next);
      return next;
    };
    const targets = plans.filter((plan) => filesByMatchId.has(plan.match.id));
    if (targets.length === 0) return { kind: 'idle' };
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    const clipper = clipperRef.current ?? createClipper();
    clipperRef.current = clipper;

    try {
      setStatus({ kind: 'loading' });
      await clipper.load(signal);

      const entries: ZipEntry[] = [];
      setStatus({ kind: 'clipping', done: 0, total: targets.length });
      for (const group of groupClipsByMatch(targets)) {
        const file = filesByMatchId.get(group.match.id);
        if (!file) continue;
        await clipper.mount(file);
        try {
          for (const plan of group.clips) {
            if (signal.aborted) throw signal.reason;
            entries.push({ name: plan.fileName, data: await clipper.clip(plan, signal) });
            setStatus({ kind: 'clipping', done: entries.length, total: targets.length });
          }
        } finally {
          if (!signal.aborted) await clipper.unmount();
        }
      }

      setStatus({ kind: 'zipping' });
      entries.push({ name: CLIP_INDEX_FILE_NAME, data: new TextEncoder().encode(buildClipIndexCsv(targets)) });
      const zip = await createZip(entries);
      if (signal.aborted) throw signal.reason;
      downloadBlob(buildClipZipFileName(sanitizeFilename(goalkeeper.name), todayLocalDate()), zip);
      return finish({ kind: 'done', count: targets.length });
    } catch (error) {
      // 中止・失敗したら Worker を終了する（ffmpeg の状態が中途半端になるため、次回は読み込み直す）
      clipper.terminate();
      clipperRef.current = null;
      if (signal.aborted) {
        return finish({ kind: 'cancelled' });
      } else {
        console.error(error);
        return finish({
          kind: 'error',
          message:
            '書き出せませんでした。選んだファイルがその試合の動画か、動画ファイルとして読めるものかを確認してください。',
        });
      }
    } finally {
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => setStatus({ kind: 'idle' }), []);

  const isRunning = status.kind === 'loading' || status.kind === 'clipping' || status.kind === 'zipping';
  return { status, isRunning, start, cancel, reset };
}
