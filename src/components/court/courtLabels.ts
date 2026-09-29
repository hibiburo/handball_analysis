import { zoneLabels, type ShotZone } from '@/domain/enums';

/**
 * コート図の中に表示するシュート位置の名前。
 * ウイングはコートの隅の狭い領域なので2行に分ける（表示名そのものは glossary.md のとおり）。
 */
export function courtZoneLabelLines(zone: ShotZone): string[] {
  if (zone === 'lw') return ['レフト', 'ウイング'];
  if (zone === 'rw') return ['ライト', 'ウイング'];
  return [zoneLabels[zone]];
}
