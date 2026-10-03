import { roundVideoTime } from '@/lib/time';
import { goalCellLabels, shotResultLabels, zoneLabels } from './enums';
import type { Match, Shot } from './types';

/** 1シーン分の切り抜きの計画（.steering/20261003-scene-mp4-export） */
export type ClipPlan = {
  shot: Shot;
  match: Match;
  /** 切り抜きの開始位置（秒、小数第1位）。記録時刻 − 前余白（0秒より前にはしない） */
  start: number;
  /** 切り抜く長さ（秒、小数第1位）。開始を0秒に切り詰めた分は短くなる */
  duration: number;
  /** zip の中の MP4 のファイル名 */
  fileName: string;
};

type PlanClipsParams = {
  /** シーン一覧と同じ順番のシュート */
  shots: readonly Shot[];
  matchesById: ReadonlyMap<string, Match>;
  preSeconds: number;
  postSeconds: number;
};

/** ファイル名に使えない文字（Windows・macOS・zip の区切り）と空白を取り除く */
function safePart(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, '');
}

/**
 * MP4 のファイル名。例: 20260920_23m41s_レフトバック_コース1_失点.mp4
 * 動画時刻は分と秒（1時間を超える場合は 75m03s のように分で表す）。コースが未入力なら省く。
 */
export function clipFileName(shot: Shot, match: Match): string {
  const total = Math.max(0, Math.floor(shot.videoTime));
  const time = `${String(Math.floor(total / 60)).padStart(2, '0')}m${String(total % 60).padStart(2, '0')}s`;
  const parts = [
    match.date.replaceAll('-', ''),
    time,
    zoneLabels[shot.zone],
    ...(shot.goalCell !== undefined ? [goalCellLabels[shot.goalCell]] : []),
    shotResultLabels[shot.result],
  ];
  return `${parts.map(safePart).join('_')}.mp4`;
}

/**
 * シーン一覧のシュートから、切り抜きの計画を作る。
 * 範囲はシーン再生と同じ「記録時刻 − 前余白 〜 記録時刻 + 後余白」。
 * 試合が見つからないシュートは除く。同じファイル名が重なる場合は _2・_3 を付ける。
 */
export function planClips({ shots, matchesById, preSeconds, postSeconds }: PlanClipsParams): ClipPlan[] {
  const used = new Map<string, number>();
  const plans: ClipPlan[] = [];
  for (const shot of shots) {
    const match = matchesById.get(shot.matchId);
    if (!match) continue;
    const start = roundVideoTime(Math.max(0, shot.videoTime - preSeconds));
    const duration = roundVideoTime(shot.videoTime + postSeconds - start);
    const base = clipFileName(shot, match);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const fileName = count === 1 ? base : base.replace(/\.mp4$/, `_${count}.mp4`);
    plans.push({ shot, match, start, duration, fileName });
  }
  return plans;
}

/** zip の中のシーン一覧のファイル名 */
export const CLIP_INDEX_FILE_NAME = 'シーン一覧.csv';

/** 例: handball_analysis_clips_山田太郎_20261003.zip（goalkeeperName はファイル名に使える形にしたもの） */
export function buildClipZipFileName(goalkeeperName: string, localDate: string): string {
  return `handball_analysis_clips_${goalkeeperName}_${localDate.replaceAll('-', '')}.zip`;
}

/** 試合ごとにまとめる（試合を選んだ順に、元の動画ファイルを1回だけ開いて切り抜くため）。順番は最初に現れた順 */
export function groupClipsByMatch(plans: readonly ClipPlan[]): { match: Match; clips: ClipPlan[] }[] {
  const groups = new Map<string, { match: Match; clips: ClipPlan[] }>();
  for (const plan of plans) {
    const group = groups.get(plan.match.id) ?? { match: plan.match, clips: [] };
    group.clips.push(plan);
    groups.set(plan.match.id, group);
  }
  return [...groups.values()];
}
