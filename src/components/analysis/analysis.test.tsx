import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoalHeatmap } from '@/components/court/GoalHeatmap';
import type { GoalCell } from '@/domain/enums';
import { buildGoalHeatmap } from '@/domain/stats/heatmap';
import { selectGoalkeeperFilter, useAnalysisFilterStore } from '@/stores/analysisFilterStore';
import { buildMatch, buildShot } from '@/test/factories';
import { FilterPanel } from './FilterPanel';

describe('GoalHeatmap', () => {
  const shots = [
    buildShot({ goalCell: 1, result: 'goal' }),
    buildShot({ goalCell: 1, result: 'goal' }),
    buildShot({ goalCell: 1, result: 'goal' }),
    buildShot({ goalCell: 1, result: 'save' }),
    buildShot({ goalCell: 9, result: 'save' }),
  ];
  const heatmap = buildGoalHeatmap(shots, 3);

  function renderHeatmap(overrides: Partial<Parameters<typeof GoalHeatmap>[0]> = {}) {
    const onCellSelect = vi.fn<(cell: GoalCell) => void>();
    const onMetricChange = vi.fn();
    render(
      <GoalHeatmap
        heatmap={heatmap}
        metric="goalRate"
        onMetricChange={onMetricChange}
        selectedCells={[]}
        onCellSelect={onCellSelect}
        {...overrides}
      />,
    );
    return { onCellSelect, onMetricChange };
  }

  it('各コースに指標の値と「失点/枠内」を表示する', () => {
    renderHeatmap();
    const cell1 = screen.getByRole('button', { name: /^コース1（左上）/ });
    expect(cell1).toHaveTextContent('75%');
    expect(cell1).toHaveTextContent('3/4');
    expect(cell1).not.toHaveTextContent('参考');
  });

  it('枠内シュートが閾値未満のコースは参考値と分かる', () => {
    renderHeatmap();
    const cell9 = screen.getByRole('button', { name: /^コース9（右下）/ });
    expect(cell9).toHaveTextContent('0%');
    expect(cell9).toHaveTextContent('参考');
    expect(cell9).toHaveAccessibleName(/参考値/);
  });

  it('枠内シュートがないコースは「−」を表示する', () => {
    renderHeatmap();
    expect(screen.getByRole('button', { name: /^コース5（中央）/ })).toHaveTextContent('−');
  });

  it('本数の表示に切り替えられ、セルを押すと onCellSelect を呼ぶ', async () => {
    const user = userEvent.setup();
    const { onCellSelect, onMetricChange } = renderHeatmap();
    await user.click(screen.getByRole('radio', { name: '本数' }));
    expect(onMetricChange).toHaveBeenCalledWith('shotCount');
    await user.click(screen.getByRole('button', { name: /^コース1/ }));
    expect(onCellSelect).toHaveBeenCalledWith(1);
  });

  it('本数表示ではシュート本数を表示する', () => {
    renderHeatmap({ metric: 'shotCount' });
    expect(screen.getByRole('button', { name: /^コース1/ })).toHaveTextContent('4本');
  });

  it('選んだコースを強調する', () => {
    renderHeatmap({ selectedCells: [9] });
    expect(screen.getByRole('button', { name: /^コース9/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^コース1/ })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('FilterPanel', () => {
  const GK = 'gk-1';
  const matches = [buildMatch({ homeTeam: 'A', awayTeam: 'B' }), buildMatch({ homeTeam: 'C', awayTeam: 'D' })];
  const getFilter = () => selectGoalkeeperFilter(GK)(useAnalysisFilterStore.getState());

  beforeEach(() => {
    useAnalysisFilterStore.setState({ byGoalkeeper: {} });
  });

  it('条件のボタンを押すとストアに反映され、もう一度押すと外れる', async () => {
    const user = userEvent.setup();
    render(<FilterPanel goalkeeperId={GK} matches={matches} />);

    await user.click(screen.getByRole('button', { name: /結果/ }));
    await user.click(screen.getByRole('button', { name: '失点' }));
    expect(getFilter().criteria.results).toEqual(['goal']);
    expect(screen.getByRole('button', { name: '失点' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '失点' }));
    expect(getFilter().criteria.results).toEqual([]);
  });

  it('試合のチェックを外すと除外され、クリアしても試合の除外は残る', async () => {
    const user = userEvent.setup();
    render(<FilterPanel goalkeeperId={GK} matches={matches} />);

    await user.click(screen.getByRole('checkbox', { name: /C vs D/ }));
    expect(getFilter().excludedMatchIds).toEqual([matches[1]?.id]);

    await user.click(screen.getByRole('button', { name: /シュート位置/ }));
    await user.click(screen.getByRole('button', { name: 'レフトバック' }));
    await user.click(screen.getByRole('button', { name: 'クリア' }));
    expect(getFilter().criteria.zones).toEqual([]);
    expect(getFilter().excludedMatchIds).toHaveLength(1);
  });
});
