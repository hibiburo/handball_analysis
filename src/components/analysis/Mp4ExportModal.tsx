import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { groupClipsByMatch, type ClipPlan } from '@/domain/clips';
import type { Goalkeeper, Match } from '@/domain/types';
import { useMp4Export, type Mp4ExportStatus } from '@/hooks/useMp4Export';
import { formatBytes } from '@/lib/storage';

type Mp4ExportModalProps = {
  goalkeeper: Goalkeeper;
  /** 書き出すシーンの切り抜き計画（シーン一覧と同じ順番） */
  plans: readonly ClipPlan[];
  onClose: () => void;
};

/**
 * シーンを MP4 で書き出す（.steering/20261003-scene-mp4-export）。
 * 試合ごとに元の動画ファイルを選び、ブラウザの中で切り抜いて zip でダウンロードする。
 */
export function Mp4ExportModal({ goalkeeper, plans, onClose }: Mp4ExportModalProps) {
  const { showToast } = useToast();
  const groups = useMemo(() => groupClipsByMatch(plans), [plans]);
  const [filesByMatchId, setFilesByMatchId] = useState<Map<string, File>>(new Map());
  const { status, isRunning, start, cancel } = useMp4Export();

  const targetCount = groups.filter((g) => filesByMatchId.has(g.match.id)).reduce((sum, g) => sum + g.clips.length, 0);

  function selectFile(matchId: string, file: File | undefined) {
    setFilesByMatchId((current) => {
      const next = new Map(current);
      if (file) next.set(matchId, file);
      else next.delete(matchId);
      return next;
    });
  }

  async function handleStart() {
    const result = await start({ goalkeeper, plans, filesByMatchId });
    // 完了したらトーストで知らせて閉じる（中止・エラーのときは画面に残して理由を表示する）
    if (result.kind === 'done') {
      showToast(`${result.count}件の MP4 を書き出しました`, { tone: 'success' });
      onClose();
    }
  }

  function handleClose() {
    if (isRunning) cancel();
    onClose();
  }

  return (
    <Modal
      isOpen
      size="lg"
      title="MP4 で書き出す"
      onClose={handleClose}
      footer={
        isRunning ? (
          <Button variant="danger" onClick={cancel}>
            中止
          </Button>
        ) : (
          <>
            <Button onClick={handleClose}>閉じる</Button>
            <Button variant="primary" disabled={targetCount === 0} onClick={() => void handleStart()}>
              {targetCount > 0 ? `${targetCount}件を書き出す` : '書き出す'}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          試合ごとに、YouTube に上げた動画の<span className="font-bold text-foreground">元の動画ファイル</span>
          （または YouTube Studio
          からダウンロードしたファイル）を選んでください。各シーンを記録時刻の前余白〜後余白で切り抜いた MP4 を zip
          にまとめてダウンロードします。変換はこの端末の中だけで行い、動画は外部に送信しません。
        </p>

        <ul className="flex flex-col gap-2">
          {groups.map(({ match, clips }) => (
            <MatchFileRow
              key={match.id}
              match={match}
              clipCount={clips.length}
              file={filesByMatchId.get(match.id)}
              disabled={isRunning}
              onSelect={(file) => selectFile(match.id, file)}
            />
          ))}
        </ul>

        <ExportStatus status={status} />
      </div>
    </Modal>
  );
}

function MatchFileRow({
  match,
  clipCount,
  file,
  disabled,
  onSelect,
}: {
  match: Match;
  clipCount: number;
  file: File | undefined;
  disabled: boolean;
  onSelect: (file: File | undefined) => void;
}) {
  const inputId = useId();
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {match.date.replaceAll('-', '/')} {match.homeTeam} vs {match.awayTeam}
        </p>
        <p className="truncate text-sm text-muted">
          {clipCount}件のシーン ／{' '}
          {file ? (
            <span className="text-foreground">
              {file.name}（{formatBytes(file.size)}）
            </span>
          ) : (
            <span className="text-warning">動画ファイルを選んでいないため書き出しません</span>
          )}
        </p>
      </div>
      <label
        htmlFor={inputId}
        className={`inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium ${
          disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer hover:bg-surface-hover'
        }`}
      >
        {file ? 'ファイルを変える' : '動画ファイルを選ぶ'}
      </label>
      <input
        id={inputId}
        type="file"
        accept="video/*"
        className="sr-only"
        aria-label={`${match.date} ${match.homeTeam} vs ${match.awayTeam} の動画ファイル`}
        disabled={disabled}
        onChange={(event) => onSelect(event.target.files?.[0])}
      />
    </li>
  );
}

function ExportStatus({ status }: { status: Mp4ExportStatus }) {
  switch (status.kind) {
    case 'idle':
    case 'done':
      return null;
    case 'loading':
      return <p role="status">動画変換の準備をしています（初回のみ、約10MBを読み込みます）…</p>;
    case 'clipping':
      return (
        <div role="status" className="flex flex-col gap-1">
          <p>
            MP4 を作成しています… {status.done} / {status.total}
          </p>
          <progress className="h-2 w-full accent-primary" value={status.done} max={status.total} />
        </div>
      );
    case 'zipping':
      return <p role="status">zip にまとめています…</p>;
    case 'cancelled':
      return <p role="status">中止しました。ダウンロードはしていません。</p>;
    case 'error':
      return (
        <p role="alert" className="text-danger">
          {status.message}
        </p>
      );
  }
}
