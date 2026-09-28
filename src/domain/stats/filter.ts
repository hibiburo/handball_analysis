import type {
  GoalCell,
  Half,
  Handedness,
  ShooterPosition,
  ShotResult,
  ShotType,
  ShotZone,
  Situation,
} from '../enums';
import type { Shot } from '../types';

/**
 * 絞り込み条件。各項目は複数の値を選べ、空の配列は「条件なし（全件）」を表す。
 * 同じ項目の中は OR、項目どうしは AND で組み合わせる（functional-design.md 5.3）。
 */
export type FilterCriteria = {
  /** 対象の試合。空なら全試合 */
  matchIds: string[];
  zones: ShotZone[];
  goalCells: GoalCell[];
  shotTypes: ShotType[];
  results: ShotResult[];
  shooterHands: Handedness[];
  shooterPositions: ShooterPosition[];
  situations: Situation[];
  halves: Half[];
};

export const emptyFilterCriteria: FilterCriteria = {
  matchIds: [],
  zones: [],
  goalCells: [],
  shotTypes: [],
  results: [],
  shooterHands: [],
  shooterPositions: [],
  situations: [],
  halves: [],
};

/** 条件が指定されていれば、値がその中に含まれるか。任意項目が未入力のシュートは、条件がある場合は除外する */
function matches<T>(selected: readonly T[], value: T | undefined): boolean {
  if (selected.length === 0) return true;
  return value !== undefined && selected.includes(value);
}

export function applyFilter(shots: readonly Shot[], criteria: FilterCriteria): Shot[] {
  return shots.filter(
    (shot) =>
      matches(criteria.matchIds, shot.matchId) &&
      matches(criteria.zones, shot.zone) &&
      matches(criteria.goalCells, shot.goalCell) &&
      matches(criteria.shotTypes, shot.shotType) &&
      matches(criteria.results, shot.result) &&
      matches(criteria.shooterHands, shot.shooterHand) &&
      matches(criteria.shooterPositions, shot.shooterPosition) &&
      matches(criteria.situations, shot.situation) &&
      matches(criteria.halves, shot.half),
  );
}

/** 試合以外の条件が1つでも指定されているか */
export function hasActiveCriteria(criteria: Omit<FilterCriteria, 'matchIds'>): boolean {
  return Object.values(criteria).some((values: unknown[]) => values.length > 0);
}
