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
import type { Match, Shot } from '@/domain/types';
import { buildYouTubeWatchUrl } from '@/domain/youtube';
import { formatVideoTime } from '@/lib/time';
import { EXPORT_APP_NAME } from '../schemas';

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

export const SCENE_CSV_HEADERS = [
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
  '動画リンク',
] as const;

type SceneCsvParams = {
  /** シーン一覧と同じ順番のシュート */
  shots: readonly Shot[];
  matchesById: ReadonlyMap<string, Match>;
  /** 動画リンクの再生開始位置を、記録時刻のこの秒数前にする（シーン再生と同じ前余白） */
  preSeconds: number;
};

/**
 * 選手に共有するためのシーン一覧の CSV を作る（.steering/20261003-scene-link-csv）。
 * 1行1シーンで、そのシーンの少し前（前余白）から再生する動画リンクを含める。
 */
export function buildSceneCsv({ shots, matchesById, preSeconds }: SceneCsvParams): string {
  const rows = shots.map((shot) => {
    const match = matchesById.get(shot.matchId);
    return [
      match?.date.replaceAll('-', '/') ?? '',
      match ? `${match.homeTeam} vs ${match.awayTeam}` : '',
      match?.competition ?? '',
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
      match ? buildYouTubeWatchUrl({ videoId: match.youtubeVideoId, start: shot.videoTime - preSeconds }) : '',
    ];
  });
  return toCsv([SCENE_CSV_HEADERS, ...rows]);
}

/** 例: handball_analysis_scenes_山田太郎_20261003.csv（goalkeeperName はファイル名に使える形にしたもの） */
export function buildSceneCsvFileName(goalkeeperName: string, localDate: string): string {
  return `${EXPORT_APP_NAME}_scenes_${goalkeeperName}_${localDate.replaceAll('-', '')}.csv`;
}
