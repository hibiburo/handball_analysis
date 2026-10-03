import type { ClipPlan } from '@/domain/clips';
import {
  goalCellLabels,
  goalkeeperActionLabels,
  halfLabels,
  handednessLabels,
  shooterPositionLabels,
  shotResultLabels,
  shotTypeLabels,
  situationLabels,
  zoneLabels,
} from '@/domain/enums';
import { formatVideoTime } from '@/lib/time';

/** Excel で UTF-8 の CSV を文字化けせずに開くための BOM */
const BOM = '\uFEFF';

/** 数式として実行される可能性のある先頭文字（CSV インジェクション対策。architecture.md 4章） */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** 行の配列を CSV 文字列にする（BOM 付き、改行は CRLF、RFC 4180 のエスケープ） */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return BOM + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

export const CLIP_INDEX_HEADERS = [
  'ファイル名',
  '試合日',
  '対戦',
  '大会',
  '動画時刻',
  'シュート位置',
  'シュート種別',
  'コース',
  '結果',
  'GKの対応',
  '利き手',
  'ポジション',
  '数的状況',
  '前後半',
  'メモ',
] as const;

/** zip に入れるシーン一覧（どの MP4 がどのシーンか）。.steering/20261003-scene-mp4-export */
export function buildClipIndexCsv(clips: readonly ClipPlan[]): string {
  const rows = clips.map(({ shot, match, fileName }) => [
    fileName,
    match.date.replaceAll('-', '/'),
    `${match.homeTeam} vs ${match.awayTeam}`,
    match.competition ?? '',
    formatVideoTime(shot.videoTime),
    zoneLabels[shot.zone],
    shot.shotType ? shotTypeLabels[shot.shotType] : '',
    shot.goalCell !== undefined ? goalCellLabels[shot.goalCell] : '',
    shotResultLabels[shot.result],
    shot.goalkeeperAction ? goalkeeperActionLabels[shot.goalkeeperAction] : '',
    shot.shooterHand ? handednessLabels[shot.shooterHand] : '',
    shot.shooterPosition ? shooterPositionLabels[shot.shooterPosition] : '',
    shot.situation ? situationLabels[shot.situation] : '',
    shot.half !== undefined ? halfLabels[shot.half] : '',
    shot.memo ?? '',
  ]);
  return toCsv([CLIP_INDEX_HEADERS, ...rows]);
}
