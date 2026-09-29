import clsx from 'clsx';
import { situationalZones, zoneLabels, type ShotZone } from '@/domain/enums';
// zoneLabels は凡例とボタンの表示名、courtZoneLabelLines はコート図の中の表示に使う
import { courtZoneLabelLines } from './courtLabels';
import { CourtDiagram } from './CourtZoneShape';

type CourtZonePickerProps = {
  value: ShotZone | undefined;
  onChange: (zone: ShotZone) => void;
  isInvalid?: boolean;
};

/**
 * シュート位置を選ぶ。コート図のゾーンと、7mスロー・速攻・ロングシュートのボタン（場所より状況を優先するため図の外に置く）。
 */
export function CourtZonePicker({ value, onChange, isInvalid = false }: CourtZonePickerProps) {
  return (
    <fieldset>
      <legend className={clsx('mb-1 text-sm font-bold', isInvalid ? 'text-danger' : 'text-muted')}>
        シュート位置<span aria-hidden="true"> *</span>
        {value && <span className="ml-2 font-normal text-foreground">{zoneLabels[value]}</span>}
      </legend>
      <CourtDiagram
        className="w-full rounded-lg border border-border"
        getZoneProps={(zone) => {
          const isSelected = zone === value;
          return {
            fillClassName: isSelected ? 'fill-primary' : 'fill-surface hover:fill-surface-hover',
            textClassName: isSelected ? 'fill-primary-foreground' : 'fill-foreground',
            lines: courtZoneLabelLines(zone),
            ariaLabel: zoneLabels[zone],
            isPressed: isSelected,
            onSelect: () => onChange(zone),
          };
        }}
      />
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {situationalZones.map((zone) => {
          const isSelected = zone === value;
          return (
            <button
              key={zone}
              type="button"
              aria-pressed={isSelected}
              className={clsx(
                'min-h-11 rounded-lg border text-sm font-medium',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface hover:bg-surface-hover',
              )}
              onClick={() => onChange(zone)}
            >
              {zoneLabels[zone]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
