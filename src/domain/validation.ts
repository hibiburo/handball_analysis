import { err, ok, type Result } from '@/lib/result';
import { roundVideoTime } from '@/lib/time';
import type { ShotResult } from './enums';
import type { ShotDraft, ShotInput } from './types';

/** メモの最大文字数（V7） */
export const MEMO_MAX_LENGTH = 500;
/** チーム名・GK名などの最大文字数（V7） */
export const NAME_MAX_LENGTH = 50;

/** コースが必須か（V2: 失点・セーブ） */
export function isGoalCellRequired(result: ShotResult | undefined): boolean {
  return result === 'goal' || result === 'save';
}

/** コースを入力できるか（V3・V4: 枠外・DFブロックでは入力不可） */
export function isGoalCellAllowed(result: ShotResult | undefined): boolean {
  return result !== 'miss' && result !== 'blocked';
}

/** GKの対応を入力できるか（V5: セーブのみ） */
export function isGoalkeeperActionAllowed(result: ShotResult | undefined): boolean {
  return result === 'save';
}

export type ShotField = 'goalkeeperId' | 'zone' | 'result' | 'goalCell' | 'goalkeeperAction' | 'videoTime' | 'memo';

export type ShotValidationError =
  | { field: ShotField; code: 'required' }
  | { field: ShotField; code: 'not_allowed' }
  | { field: 'videoTime'; code: 'out_of_range' }
  | { field: 'memo'; code: 'too_long' };

type ValidateOptions = {
  /** 動画の長さ（秒）。分かっている場合のみ V6 の上限を確認する */
  videoDuration?: number;
};

/**
 * 入力中のシュートを検証し、保存できる形にする（functional-design.md 5.2 の V1〜V7）。
 * 動画時刻は小数第1位に丸める。
 */
export function validateShotInput(
  draft: ShotDraft,
  options: ValidateOptions = {},
): Result<ShotInput, ShotValidationError[]> {
  const errors: ShotValidationError[] = [];
  const { goalkeeperId, zone, result, goalCell, goalkeeperAction, videoTime, memo } = draft;

  // V1: 必須項目
  if (!goalkeeperId) errors.push({ field: 'goalkeeperId', code: 'required' });
  if (!zone) errors.push({ field: 'zone', code: 'required' });
  if (!result) errors.push({ field: 'result', code: 'required' });

  // V2〜V5: 結果に応じたコース・GKの対応
  if (result) {
    if (isGoalCellRequired(result) && goalCell === undefined) {
      errors.push({ field: 'goalCell', code: 'required' });
    }
    if (!isGoalCellAllowed(result) && goalCell !== undefined) {
      errors.push({ field: 'goalCell', code: 'not_allowed' });
    }
    if (!isGoalkeeperActionAllowed(result) && goalkeeperAction !== undefined) {
      errors.push({ field: 'goalkeeperAction', code: 'not_allowed' });
    }
  }

  // V6: 動画時刻の範囲
  if (videoTime === undefined) {
    errors.push({ field: 'videoTime', code: 'required' });
  } else if (
    !Number.isFinite(videoTime) ||
    videoTime < 0 ||
    (options.videoDuration !== undefined && options.videoDuration > 0 && videoTime > options.videoDuration)
  ) {
    errors.push({ field: 'videoTime', code: 'out_of_range' });
  }

  // V7: メモの文字数
  if (memo !== undefined && memo.length > MEMO_MAX_LENGTH) {
    errors.push({ field: 'memo', code: 'too_long' });
  }

  if (errors.length > 0 || !goalkeeperId || !zone || !result || videoTime === undefined) {
    return err(errors);
  }

  const trimmedMemo = memo?.trim();
  return ok({
    ...(draft.id !== undefined && { id: draft.id }),
    matchId: draft.matchId,
    goalkeeperId,
    videoTime: roundVideoTime(videoTime),
    zone,
    result,
    ...(goalCell !== undefined && { goalCell }),
    ...(goalkeeperAction !== undefined && { goalkeeperAction }),
    ...(draft.half !== undefined && { half: draft.half }),
    ...(draft.gameMinute !== undefined && { gameMinute: draft.gameMinute }),
    ...(draft.shotType !== undefined && { shotType: draft.shotType }),
    ...(draft.shooterHand !== undefined && { shooterHand: draft.shooterHand }),
    ...(draft.shooterPosition !== undefined && { shooterPosition: draft.shooterPosition }),
    ...(draft.situation !== undefined && { situation: draft.situation }),
    ...(trimmedMemo && { memo: trimmedMemo }),
  });
}

/**
 * 結果を変えたときに、入力できなくなった項目を消した下書きを返す（V4・V5）。
 * 例: 結果を「枠外」にしたら、入力済みのコースと GK の対応を消す。
 */
export function clearDisallowedFields(draft: ShotDraft): ShotDraft {
  const next = { ...draft };
  if (!isGoalCellAllowed(next.result)) delete next.goalCell;
  if (!isGoalkeeperActionAllowed(next.result)) delete next.goalkeeperAction;
  return next;
}
