import { formatVideoTime } from '@/lib/time';
import { shotTypeLabels } from './enums';
import type { Shot } from './types';

/**
 * 分析画面のシーン一覧を Excel に書き出すための行（.steering/20261003-scene-excel-export）。
 * 列は利用者が指定した「シュート種別」「動画開始時間」「動画終了時間」の3つ。
 */
export const SCENE_SHEET_HEADERS = ['シュート種別', '動画開始時間', '動画終了時間'] as const;

export type SceneSheetRow = {
  /** 表示名。未入力は空文字 */
  shotType: string;
  /** 記録時刻 − 前余白（m:ss、1時間以上は h:mm:ss） */
  start: string;
  /** 記録時刻 + 後余白 */
  end: string;
};

type BuildSceneSheetRowsParams = {
  /** シーン一覧と同じ順番のシュート */
  shots: readonly Shot[];
  preSeconds: number;
  postSeconds: number;
};

/** 範囲はシーン再生と同じ「記録時刻 − 前余白 〜 記録時刻 + 後余白」。開始は0秒より前にしない */
export function buildSceneSheetRows({ shots, preSeconds, postSeconds }: BuildSceneSheetRowsParams): SceneSheetRow[] {
  return shots.map((shot) => ({
    shotType: shot.shotType ? shotTypeLabels[shot.shotType] : '',
    start: formatVideoTime(Math.max(0, shot.videoTime - preSeconds)),
    end: formatVideoTime(shot.videoTime + postSeconds),
  }));
}

/** 例: handball_analysis_scenes_山田太郎_20261003.xlsx（goalkeeperName はファイル名に使える形にしたもの） */
export function buildSceneSheetFileName(goalkeeperName: string, localDate: string): string {
  return `handball_analysis_scenes_${goalkeeperName}_${localDate.replaceAll('-', '')}.xlsx`;
}
