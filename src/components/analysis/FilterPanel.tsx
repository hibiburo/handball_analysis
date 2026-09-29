import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import {
  goalCellLabels,
  goalCells,
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
  shotZones,
  situationLabels,
  situations,
  zoneLabels,
} from '@/domain/enums';
import { hasActiveCriteria } from '@/domain/stats/filter';
import type { Match } from '@/domain/types';
import {
  selectGoalkeeperFilter,
  useAnalysisFilterStore,
  type CriteriaKey,
  type ShotCriteria,
} from '@/stores/analysisFilterStore';

type FilterPanelProps = {
  goalkeeperId: string;
  matches: Match[];
};

type Section<K extends CriteriaKey> = {
  key: K;
  label: string;
  values: readonly ShotCriteria[K][number][];
  labels: Record<ShotCriteria[K][number], string>;
};

// 各項目の選択肢。型は項目ごとに異なるため、個別に定義してまとめる
const sections = [
  { key: 'zones', label: 'シュート位置', values: shotZones, labels: zoneLabels } satisfies Section<'zones'>,
  { key: 'goalCells', label: 'コース', values: goalCells, labels: goalCellLabels } satisfies Section<'goalCells'>,
  { key: 'shotTypes', label: 'シュート種別', values: shotTypes, labels: shotTypeLabels } satisfies Section<'shotTypes'>,
  { key: 'results', label: '結果', values: shotResults, labels: shotResultLabels } satisfies Section<'results'>,
  {
    key: 'shooterHands',
    label: '利き手',
    values: handednesses,
    labels: handednessLabels,
  } satisfies Section<'shooterHands'>,
  {
    key: 'shooterPositions',
    label: 'ポジション',
    values: shooterPositions,
    labels: shooterPositionLabels,
  } satisfies Section<'shooterPositions'>,
  { key: 'situations', label: '数的状況', values: situations, labels: situationLabels } satisfies Section<'situations'>,
  { key: 'halves', label: '前後半', values: halves, labels: halfLabels } satisfies Section<'halves'>,
];

/**
 * 絞り込み条件（functional-design.md 5.3）。同じ項目の中は「または」、項目どうしは「かつ」。
 * 条件は GK ごとにストアへ保存し、画面を開き直しても復元する。
 */
export function FilterPanel({ goalkeeperId, matches }: FilterPanelProps) {
  const filter = useAnalysisFilterStore(selectGoalkeeperFilter(goalkeeperId));
  const toggleCriteriaValue = useAnalysisFilterStore((s) => s.toggleCriteriaValue);
  const toggleExcludedMatch = useAnalysisFilterStore((s) => s.toggleExcludedMatch);
  const clearCriteria = useAnalysisFilterStore((s) => s.clearCriteria);

  return (
    <div className="flex flex-col gap-3" aria-label="絞り込み" role="region">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">絞り込み</h2>
        <Button
          size="sm"
          variant="ghost"
          disabled={!hasActiveCriteria(filter.criteria)}
          onClick={() => clearCriteria(goalkeeperId)}
        >
          クリア
        </Button>
      </div>

      <FilterSection
        label="試合"
        activeCount={filter.excludedMatchIds.length > 0 ? matches.length - filter.excludedMatchIds.length : 0}
        defaultOpen
      >
        <div className="flex flex-col gap-1">
          {matches.map((match) => (
            <label
              key={match.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-1 text-sm hover:bg-surface-hover"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0"
                checked={!filter.excludedMatchIds.includes(match.id)}
                onChange={() => toggleExcludedMatch(goalkeeperId, match.id)}
              />
              <span className="leading-tight">
                <span className="block text-xs text-muted">{match.date.replaceAll('-', '/')}</span>
                {match.homeTeam} vs {match.awayTeam}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {sections.map((section) => {
        const selected: readonly (string | number)[] = filter.criteria[section.key];
        return (
          <FilterSection key={section.key} label={section.label} activeCount={selected.length}>
            <div className="flex flex-wrap gap-1">
              {section.values.map((value) => {
                const isSelected = selected.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    className={clsx(
                      'min-h-11 rounded-full border px-3 text-sm',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-surface hover:bg-surface-hover',
                    )}
                    onClick={() =>
                      toggleCriteriaValue(
                        goalkeeperId,
                        section.key,
                        value as never /* 項目ごとの値の型は sections で保証 */,
                      )
                    }
                  >
                    {(section.labels as Record<string | number, string>)[value]}
                  </button>
                );
              })}
            </div>
          </FilterSection>
        );
      })}
    </div>
  );
}

function FilterSection({
  label,
  activeCount,
  defaultOpen = false,
  children,
}: {
  label: string;
  activeCount: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen || activeCount > 0);
  return (
    <section className="border-b border-border pb-2">
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between text-sm font-bold"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {isOpen ? '▾' : '▸'} {label}
        </span>
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{activeCount}</span>
        )}
      </button>
      {isOpen && children}
    </section>
  );
}
