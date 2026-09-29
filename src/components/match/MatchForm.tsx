import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { YouTubePlayer } from '@/components/video/YouTubePlayer';
import { toFieldErrors } from '@/domain/formErrors';
import { matchInputSchema } from '@/domain/schemas';
import type { Match } from '@/domain/types';
import { parseYouTubeVideoId } from '@/domain/youtube';
import { useAllGoalkeepers } from '@/hooks/useGoalkeepers';
import { matchActions, useMatchGoalkeepers } from '@/hooks/useMatches';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { todayLocalDate } from '@/lib/time';

/** 読み込み後、この時間エラーがなければ埋め込み可能とみなす（design.md 2.3） */
const EMBED_CHECK_TIMEOUT_MS = 3000;

type MatchFormProps = {
  isOpen: boolean;
  /** 編集する試合。未指定なら新規登録 */
  match?: Match | undefined;
  /** 新規登録時に最初から選んでおくGK */
  defaultGoalkeeperId?: string | undefined;
  onClose: () => void;
  onSaved?: (match: Match) => void;
};

/** M2 試合登録・編集（functional-design.md 3.1, 5.6） */
export function MatchForm(props: MatchFormProps) {
  if (!props.isOpen) return null;
  return <MatchFormLoader {...props} />;
}

/** 編集時は紐づいているGKを読み込んでからフォームを表示する */
function MatchFormLoader(props: MatchFormProps) {
  const linkedGoalkeepers = useMatchGoalkeepers(props.match?.id);
  if (props.match && linkedGoalkeepers === undefined) return null;
  const initialIds = props.match
    ? (linkedGoalkeepers ?? []).map((g) => g.id)
    : props.defaultGoalkeeperId
      ? [props.defaultGoalkeeperId]
      : [];
  return <MatchFormContent {...props} initialGoalkeeperIds={initialIds} />;
}

type EmbedStatus = 'idle' | 'checking' | 'ok' | 'error';

function MatchFormContent({
  match,
  initialGoalkeeperIds,
  onClose,
  onSaved,
}: MatchFormProps & { initialGoalkeeperIds: string[] }) {
  const { showToast } = useToast();
  const formId = useId();
  const allGoalkeepers = useAllGoalkeepers();
  const [date, setDate] = useState(match?.date ?? todayLocalDate());
  const [competition, setCompetition] = useState(match?.competition ?? '');
  const [homeTeam, setHomeTeam] = useState(match?.homeTeam ?? '');
  const [awayTeam, setAwayTeam] = useState(match?.awayTeam ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(match?.youtubeUrl ?? '');
  const [memo, setMemo] = useState(match?.memo ?? '');
  const [goalkeeperIds, setGoalkeeperIds] = useState<string[]>(initialGoalkeeperIds);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const parsedVideoId = parseYouTubeVideoId(youtubeUrl);
  const videoId = parsedVideoId.ok ? parsedVideoId.value : undefined;
  const preview = useVideoPlayer({ videoId, autoplay: false });
  const embedStatus = useEmbedStatus(videoId, preview.isReady, preview.state, preview.error !== null);

  function toggleGoalkeeper(id: string) {
    setGoalkeeperIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = matchInputSchema.safeParse({
      ...(match && { id: match.id }),
      date,
      ...(competition.trim() !== '' && { competition }),
      homeTeam,
      awayTeam,
      youtubeUrl: youtubeUrl.trim(),
      ...(memo.trim() !== '' && { memo: memo.trim() }),
    });
    const nextErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    if (!videoId) nextErrors['youtubeUrl'] = 'YouTube の動画のURLを入力してください';
    if (goalkeeperIds.length === 0) nextErrors['goalkeepers'] = '出場GKを1人以上選んでください';
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const result = await matchActions.save(parsed.data, goalkeeperIds);
      if (!result.ok) {
        if (result.error.code === 'goalkeeper_has_shots') {
          const names = result.error.goalkeeperIds
            .map((id) => allGoalkeepers?.find((g) => g.id === id)?.name ?? id)
            .join('、');
          setErrors({ goalkeepers: `${names} はこの試合で記録済みのシュートがあるため外せません` });
        } else if (result.error.code === 'invalid_url') {
          setErrors({ youtubeUrl: 'YouTube の動画のURLを入力してください' });
        } else {
          setErrors({ goalkeepers: '出場GKを1人以上選んでください' });
        }
        setIsSaving(false);
        return;
      }
      showToast(match ? '試合を更新しました' : '試合を登録しました', { tone: 'success' });
      onSaved?.(result.value);
      onClose();
    } catch {
      showToast('保存できませんでした。もう一度お試しください。', { tone: 'error' });
      setIsSaving(false);
    }
  }

  const canSave = !isSaving && embedStatus === 'ok';

  return (
    <Modal
      isOpen
      size="lg"
      title={match ? '試合を編集' : '試合を追加'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="primary" type="submit" form={formId} disabled={!canSave}>
            {match ? '更新する' : '登録する'}
          </Button>
        </>
      }
    >
      <form id={formId} className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-[10rem_1fr] gap-3">
          <TextField
            label="日付"
            type="date"
            isRequired
            value={date}
            error={errors['date']}
            onChange={(event) => setDate(event.target.value)}
          />
          <TextField
            label="大会名"
            value={competition}
            maxLength={50}
            error={errors['competition']}
            onChange={(event) => setCompetition(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <TextField
            label="ホーム"
            isRequired
            value={homeTeam}
            maxLength={50}
            error={errors['homeTeam']}
            onChange={(event) => setHomeTeam(event.target.value)}
          />
          <span className="pb-3 text-muted">vs</span>
          <TextField
            label="アウェイ"
            isRequired
            value={awayTeam}
            maxLength={50}
            error={errors['awayTeam']}
            onChange={(event) => setAwayTeam(event.target.value)}
          />
        </div>

        <TextField
          label="YouTube の URL"
          isRequired
          type="url"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeUrl}
          error={errors['youtubeUrl'] ?? (youtubeUrl.trim() !== '' && !videoId ? 'YouTube の動画のURLではありません' : undefined)}
          hint={<EmbedStatusHint status={embedStatus} />}
          onChange={(event) => setYoutubeUrl(event.target.value)}
        />
        {videoId && (
          <YouTubePlayer containerRef={preview.containerRef} error={preview.error} className="mx-auto max-w-sm" />
        )}

        <fieldset>
          <legend className={errors['goalkeepers'] ? 'text-sm font-bold text-danger' : 'text-sm font-bold text-muted'}>
            出場GK<span aria-hidden="true"> *</span>
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {(allGoalkeepers ?? []).map((goalkeeper) => (
              <label
                key={goalkeeper.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 hover:bg-surface-hover"
              >
                <input
                  type="checkbox"
                  className="size-5"
                  checked={goalkeeperIds.includes(goalkeeper.id)}
                  onChange={() => toggleGoalkeeper(goalkeeper.id)}
                />
                <span>
                  {goalkeeper.number !== undefined && `#${goalkeeper.number} `}
                  {goalkeeper.name}
                  <span className="text-sm text-muted">（{goalkeeper.teamName}）</span>
                </span>
              </label>
            ))}
          </div>
          {errors['goalkeepers'] && <p className="mt-1 text-sm text-danger">{errors['goalkeepers']}</p>}
        </fieldset>

        <TextAreaField
          label="メモ"
          rows={2}
          maxLength={500}
          value={memo}
          error={errors['memo']}
          onChange={(event) => setMemo(event.target.value)}
        />
      </form>
    </Modal>
  );
}

/**
 * 動画を埋め込めるかを判定する。
 * 読み込みが完了して「再生待ち」になるか、一定時間エラーがなければ OK とする。
 */
function useEmbedStatus(
  videoId: string | undefined,
  isReady: boolean,
  state: string,
  hasError: boolean,
): EmbedStatus {
  const [timedOutVideoId, setTimedOutVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId || !isReady) return;
    const timer = window.setTimeout(() => setTimedOutVideoId(videoId), EMBED_CHECK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [videoId, isReady]);

  if (!videoId) return 'idle';
  if (hasError) return 'error';
  if (isReady && (state === 'cued' || state === 'paused' || state === 'playing' || timedOutVideoId === videoId)) {
    return 'ok';
  }
  return 'checking';
}

function EmbedStatusHint({ status }: { status: EmbedStatus }) {
  switch (status) {
    case 'idle':
      return 'YouTube の動画ページのURLを貼り付けてください';
    case 'checking':
      return '動画を確認しています…';
    case 'ok':
      return <span className="text-result-save">✓ この動画は再生できます</span>;
    case 'error':
      return null;
  }
}
