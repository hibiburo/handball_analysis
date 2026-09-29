import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { appDb } from '@/db/database';
import type { Shot } from '@/domain/types';
import { useShotFormStore } from '@/stores/shotFormStore';
import { buildGoalkeeper, buildShot } from '@/test/factories';
import { ShotForm } from './ShotForm';

const MATCH_ID = '00000000-0000-4000-8000-00000000aaaa';
const goalkeeper = buildGoalkeeper({ name: '山田', number: 1 });

function renderForm(overrides: Partial<Parameters<typeof ShotForm>[0]> = {}) {
  const onSaved = vi.fn<(shot: Shot, isNew: boolean) => void>();
  render(
    <ToastProvider>
      <ShotForm
        matchId={MATCH_ID}
        goalkeepers={[goalkeeper]}
        editingShot={null}
        isPlayerReady
        currentTime={83.27}
        videoDuration={3600}
        readCurrentTime={() => 83.27}
        onSaved={onSaved}
        onCancelEdit={() => {}}
        {...overrides}
      />
    </ToastProvider>,
  );
  return { onSaved, user: userEvent.setup() };
}

const recordButton = () => screen.getByRole('button', { name: /記録する/ });

describe('ShotForm', () => {
  beforeEach(async () => {
    useShotFormStore.setState({ lastGoalkeeperIdByMatch: {}, lastHalfByMatch: {}, isDetailOpen: false });
    await appDb.shots.clear();
  });

  it('GKが1人なら最初から選ばれ、必須項目が揃うまで「記録する」は押せない', async () => {
    const { user } = renderForm();
    expect(screen.getByRole('radio', { name: '#1 山田' })).toHaveAttribute('aria-checked', 'true');
    expect(recordButton()).toBeDisabled();
    expect(screen.getByText('未入力: シュート位置、結果')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'レフトバック' }));
    await user.click(screen.getByRole('radio', { name: '失点' }));
    expect(recordButton()).toBeDisabled();
    expect(screen.getByText('未入力: コース')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'コース1（左上）' }));
    expect(recordButton()).toBeEnabled();
  });

  it('結果を枠外にするとコースが入力できなくなり、選んでいたコースは消える', async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'コース7（左下）' }));
    await user.click(screen.getByRole('radio', { name: '枠外' }));

    const cell = screen.getByRole('button', { name: 'コース7（左下）' });
    expect(cell).toBeDisabled();
    expect(cell).toHaveAttribute('aria-pressed', 'false');
  });

  it('GKの対応はセーブを選んだときだけ表示する', async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole('button', { name: /詳細/ }));
    expect(screen.queryByRole('radiogroup', { name: 'GKの対応' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'セーブ' }));
    expect(screen.getByRole('radiogroup', { name: 'GKの対応' })).toBeInTheDocument();
  });

  it('記録すると押した瞬間の動画時刻で保存し、入力をリセットして担当GKは残す', async () => {
    const { user, onSaved } = renderForm();
    await user.click(screen.getByRole('button', { name: '7mスロー' }));
    await user.click(screen.getByRole('button', { name: 'コース3（右上）' }));
    await user.click(screen.getByRole('radio', { name: 'セーブ' }));
    await user.click(recordButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const [saved, isNew] = onSaved.mock.calls[0]!;
    expect(isNew).toBe(true);
    expect(saved).toMatchObject({ matchId: MATCH_ID, goalkeeperId: goalkeeper.id, zone: 'seven_m', goalCell: 3, result: 'save', videoTime: 83.3 });
    expect(await appDb.shots.get(saved.id)).toBeDefined();

    expect(screen.getByRole('radio', { name: 'セーブ' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: '#1 山田' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByRole('status')).toHaveTextContent('1:23 に記録しました');
  });

  it('保存直後の「元に戻す」で記録を取り消す', async () => {
    const { user, onSaved } = renderForm();
    await user.click(screen.getByRole('button', { name: 'センター' }));
    await user.click(screen.getByRole('radio', { name: 'DFブロック' }));
    await user.click(recordButton());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const saved = onSaved.mock.calls[0]![0];

    await user.click(await screen.findByRole('button', { name: '元に戻す' }));
    await waitFor(async () => expect(await appDb.shots.get(saved.id)).toBeUndefined());
  });

  it('動画の準備ができるまでは記録できない', () => {
    renderForm({ isPlayerReady: false });
    expect(screen.getByText('動画の準備ができると記録できます')).toBeInTheDocument();
  });

  it('編集モードでは既存の値を表示し、動画時刻を微調整して更新できる', async () => {
    const shot = buildShot({ matchId: MATCH_ID, goalkeeperId: goalkeeper.id, videoTime: 100, zone: 'rw', result: 'goal', goalCell: 9 });
    await appDb.shots.put(shot);
    const { user, onSaved } = renderForm({ editingShot: shot });

    expect(screen.getByText('編集中')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ライトウイング' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '0.5秒戻す' }));
    await user.click(screen.getByRole('button', { name: '更新する' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]).toEqual([expect.objectContaining({ id: shot.id, videoTime: 99.5 }), false]);
  });
});
