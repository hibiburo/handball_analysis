import clsx from 'clsx';
import { useState } from 'react';
import { CourtZonePicker } from '@/components/court/CourtZonePicker';
import { GoalCellPicker } from '@/components/court/GoalCellPicker';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { OptionButtonGroup } from '@/components/ui/OptionButtonGroup';
import { useToast } from '@/components/ui/Toast';
import {
  goalkeeperActionLabels,
  goalkeeperActions,
  halfLabels,
  halves,
  handednessLabels,
  handednesses,
  shooterPositionLabels,
  shooterPositions,
  shotResultLabels,
  shotResults,
  shotTypeLabels,
  shotTypes,
  situationLabels,
  situations,
  toOptions,
} from '@/domain/enums';
import type { Goalkeeper, Shot, ShotDraft } from '@/domain/types';
import {
  clearDisallowedFields,
  isGoalCellAllowed,
  isGoalCellRequired,
  isGoalkeeperActionAllowed,
  MEMO_MAX_LENGTH,
  validateShotInput,
} from '@/domain/validation';
import { shotActions } from '@/hooks/useShots';
import { formatVideoTime, roundVideoTime } from '@/lib/time';
import { useShotFormStore } from '@/stores/shotFormStore';

/** 取り消しトーストの表示時間（functional-design.md 5.1） */
const UNDO_DURATION_MS = 5000;

type ShotFormProps = {
  matchId: string;
  goalkeepers: Goalkeeper[];
  /** 編集中のシュート。null なら新規記録 */
  editingShot: Shot | null;
  isPlayerReady: boolean;
  currentTime: number;
  videoDuration: number;
  /** 記録する瞬間の再生位置をプレーヤーから読み直す */
  readCurrentTime: () => number;
  /** 保存後に呼ばれる（新規記録なら自動再開などに使う） */
  onSaved: (shot: Shot, isNew: boolean) => void;
  onCancelEdit: () => void;
};

type DraftKey = Exclude<keyof ShotDraft, 'matchId'>;

/** 項目の値を変えた下書きを返す。undefined は項目を消す（任意項目は未入力をプロパティなしで表す） */
function withField<K extends DraftKey>(draft: ShotDraft, key: K, value: ShotDraft[K] | undefined): ShotDraft {
  const next = { ...draft };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

function initialDraft(
  matchId: string,
  goalkeepers: Goalkeeper[],
  editingShot: Shot | null,
  lastGoalkeeperId: string | undefined,
  lastHalf: ShotDraft['half'],
): ShotDraft {
  if (editingShot) {
    const { id, createdAt: _c, updatedAt: _u, ...rest } = editingShot;
    return { ...rest, id };
  }
  const goalkeeperId =
    (lastGoalkeeperId && goalkeepers.some((g) => g.id === lastGoalkeeperId) ? lastGoalkeeperId : undefined) ??
    (goalkeepers.length === 1 ? goalkeepers[0]?.id : undefined);
  return {
    matchId,
    ...(goalkeeperId && { goalkeeperId }),
    ...(lastHalf && { half: lastHalf }),
  };
}

/** SC3 の入力パネル（functional-design.md 4.3, 5.1, 5.2） */
export function ShotForm({
  matchId,
  goalkeepers,
  editingShot,
  isPlayerReady,
  currentTime,
  videoDuration,
  readCurrentTime,
  onSaved,
  onCancelEdit,
}: ShotFormProps) {
  const { showToast } = useToast();
  const store = useShotFormStore();
  const [draft, setDraft] = useState<ShotDraft>(() =>
    initialDraft(
      matchId,
      goalkeepers,
      editingShot,
      store.lastGoalkeeperIdByMatch[matchId],
      store.lastHalfByMatch[matchId],
    ),
  );
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = editingShot !== null;
  const set = <K extends DraftKey>(key: K, value: ShotDraft[K] | undefined) =>
    setDraft((d) => withField(d, key, value));

  const missing = [
    !draft.goalkeeperId && '担当GK',
    !draft.zone && 'シュート位置',
    !draft.result && '結果',
    isGoalCellRequired(draft.result) && draft.goalCell === undefined && 'コース',
  ].filter((item): item is string => typeof item === 'string');
  const canSave = missing.length === 0 && !isSaving && (isEditing || isPlayerReady);

  async function handleSave() {
    if (!canSave) return;
    const videoTime = isEditing ? (draft.videoTime ?? 0) : readCurrentTime();
    const validated = validateShotInput({ ...draft, videoTime }, { videoDuration });
    if (!validated.ok) {
      showToast('入力内容を確認してください', { tone: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await shotActions.save(validated.value);
      store.setLastGoalkeeper(matchId, saved.goalkeeperId);
      store.setLastHalf(matchId, saved.half);
      showToast(
        isEditing
          ? `${formatVideoTime(saved.videoTime)} のシュートを更新しました`
          : `${formatVideoTime(saved.videoTime)} に記録しました`,
        {
          duration: UNDO_DURATION_MS,
          action: {
            label: '元に戻す',
            onAction: () => {
              void (editingShot ? shotActions.restore(editingShot) : shotActions.delete(saved.id));
            },
          },
        },
      );
      // 担当GK・前後半は保持して、次のシュートを入力できる状態に戻す
      setDraft(initialDraft(matchId, goalkeepers, null, saved.goalkeeperId, saved.half));
      onSaved(saved, !isEditing);
    } catch {
      // 保存に失敗しても入力内容は残す（development-guidelines.md 2.5）
      showToast('保存できませんでした。もう一度「記録する」を押してください。', { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  const goalkeeperOptions = goalkeepers.map((g) => ({
    value: g.id,
    label: `${g.number !== undefined ? `#${g.number} ` : ''}${g.name}`,
  }));

  return (
    <form
      aria-label="シュートの入力"
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {isEditing && (
        <div className="flex items-center justify-between rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
          <span className="font-bold">編集中</span>
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            編集をやめる
          </Button>
        </div>
      )}

      <OptionButtonGroup
        label="担当GK"
        isRequired
        columns={2}
        options={goalkeeperOptions}
        value={draft.goalkeeperId}
        onChange={(value) => set('goalkeeperId', value)}
      />
      <OptionButtonGroup
        label="前後半"
        columns={2}
        allowDeselect
        options={toOptions(halves, halfLabels)}
        value={draft.half}
        onChange={(value) => set('half', value)}
      />

      <CourtZonePicker value={draft.zone} onChange={(zone) => set('zone', zone)} />

      <GoalCellPicker
        value={draft.goalCell}
        isRequired={isGoalCellRequired(draft.result)}
        isDisabled={!isGoalCellAllowed(draft.result)}
        onChange={(cell) => set('goalCell', cell)}
      />

      <OptionButtonGroup
        label="結果"
        isRequired
        columns={3}
        options={toOptions(shotResults, shotResultLabels)}
        value={draft.result}
        onChange={(value) => setDraft((d) => clearDisallowedFields(withField(d, 'result', value)))}
      />

      <ShotDetailFields draft={draft} set={set} />

      {isEditing && draft.videoTime !== undefined && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border p-2">
          <span className="text-sm text-muted">動画時刻</span>
          <span className="font-mono font-bold tabular-nums">{formatVideoTime(draft.videoTime)}</span>
          <Button
            size="sm"
            aria-label="0.5秒戻す"
            onClick={() => set('videoTime', roundVideoTime(Math.max(0, (draft.videoTime ?? 0) - 0.5)))}
          >
            −0.5
          </Button>
          <Button
            size="sm"
            aria-label="0.5秒進める"
            onClick={() => set('videoTime', roundVideoTime((draft.videoTime ?? 0) + 0.5))}
          >
            +0.5
          </Button>
          <Button size="sm" onClick={() => set('videoTime', roundVideoTime(readCurrentTime()))}>
            現在の再生位置で上書き
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 bg-background/95 px-1 pt-1 pb-2 backdrop-blur">
        <Button type="submit" variant="primary" className="w-full text-lg" disabled={!canSave}>
          {isEditing ? '更新する' : `記録する ${formatVideoTime(currentTime)}`}
        </Button>
        {missing.length > 0 && <p className="mt-1 text-center text-xs text-danger">未入力: {missing.join('、')}</p>}
        {!isEditing && !isPlayerReady && (
          <p className="mt-1 text-center text-xs text-muted">動画の準備ができると記録できます</p>
        )}
      </div>
    </form>
  );
}

type ShotDetailFieldsProps = {
  draft: ShotDraft;
  set: <K extends DraftKey>(key: K, value: ShotDraft[K] | undefined) => void;
};

/** 任意項目（折りたたみ）。開閉状態はストアに保持する */
function ShotDetailFields({ draft, set }: ShotDetailFieldsProps) {
  const isOpen = useShotFormStore((s) => s.isDetailOpen);
  const setDetailOpen = useShotFormStore((s) => s.setDetailOpen);
  const filledCount = [
    draft.shotType,
    draft.goalkeeperAction,
    draft.shooterHand,
    draft.shooterPosition,
    draft.situation,
    draft.gameMinute,
    draft.memo,
  ].filter((v) => v !== undefined).length;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-bold text-muted"
        onClick={() => setDetailOpen(!isOpen)}
      >
        <span>{isOpen ? '▾' : '▸'} 詳細（種別・GKの対応など）</span>
        {filledCount > 0 && <span className="text-primary">{filledCount}件入力済み</span>}
      </button>
      <div className={clsx('flex flex-col gap-3 px-3 pb-3', !isOpen && 'hidden')}>
        <OptionButtonGroup
          label="シュート種別"
          columns={4}
          allowDeselect
          options={toOptions(shotTypes, shotTypeLabels)}
          value={draft.shotType}
          onChange={(value) => set('shotType', value)}
        />
        {isGoalkeeperActionAllowed(draft.result) && (
          <OptionButtonGroup
            label="GKの対応"
            columns={4}
            allowDeselect
            options={toOptions(goalkeeperActions, goalkeeperActionLabels)}
            value={draft.goalkeeperAction}
            onChange={(value) => set('goalkeeperAction', value)}
          />
        )}
        <OptionButtonGroup
          label="シューターの利き手"
          columns={3}
          allowDeselect
          options={toOptions(handednesses, handednessLabels)}
          value={draft.shooterHand}
          onChange={(value) => set('shooterHand', value)}
        />
        <OptionButtonGroup
          label="シューターのポジション"
          columns={3}
          allowDeselect
          options={toOptions(shooterPositions, shooterPositionLabels)}
          value={draft.shooterPosition}
          onChange={(value) => set('shooterPosition', value)}
        />
        <OptionButtonGroup
          label="数的状況"
          columns={3}
          allowDeselect
          options={toOptions(situations, situationLabels)}
          value={draft.situation}
          onChange={(value) => set('situation', value)}
        />
        <TextField
          label="試合時間（分）"
          inputMode="numeric"
          className="w-24"
          value={draft.gameMinute?.toString() ?? ''}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, '').slice(0, 3);
            set('gameMinute', digits === '' ? undefined : Math.min(120, Number(digits)));
          }}
        />
        <TextAreaField
          label="メモ"
          rows={2}
          maxLength={MEMO_MAX_LENGTH}
          value={draft.memo ?? ''}
          onChange={(event) => set('memo', event.target.value === '' ? undefined : event.target.value)}
        />
      </div>
    </div>
  );
}
