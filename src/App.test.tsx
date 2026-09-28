import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('ホームにGK一覧を表示し、ヘッダーから設定画面に移動できる', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'GK一覧' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'データ管理・設定' }));
    expect(await screen.findByRole('heading', { name: 'データ管理・設定' })).toBeInTheDocument();
  });

  it('存在しないパスではページが見つからない旨を表示する', () => {
    window.history.pushState({}, '', '/unknown');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument();
  });
});
