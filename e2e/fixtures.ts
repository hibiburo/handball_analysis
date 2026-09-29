import { test as base, expect, type Page } from '@playwright/test';
import { installVideoPlayerMock } from './mocks/videoPlayerMock.ts';

/** すべてのページで YouTube の代わりにモックのプレーヤーを使う */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(installVideoPlayerMock);
    await use(page);
  },
});

export { expect };

export const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/** GK を登録して GK詳細を開く */
export async function createGoalkeeper(page: Page, { name, teamName }: { name: string; teamName: string }) {
  await page.goto('/');
  await page.getByRole('button', { name: '＋ GKを追加' }).click();
  await page.getByLabel('チーム名').fill(teamName);
  await page.getByLabel('GK名').fill(name);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(name) })).toBeVisible();
}

/** GK詳細から試合を登録して記録画面を開く */
export async function createMatch(page: Page, { homeTeam, awayTeam }: { homeTeam: string; awayTeam: string }) {
  await page.getByRole('button', { name: '＋ 試合を追加' }).click();
  await page.getByLabel('ホーム').fill(homeTeam);
  await page.getByLabel('アウェイ').fill(awayTeam);
  await page.getByLabel('YouTube の URL').fill(VIDEO_URL);
  await expect(page.getByText('この動画は再生できます')).toBeVisible();
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/matches\/[^/]+\/record$/);
  await expect(page.getByRole('button', { name: '再生' })).toBeEnabled();
}

/** 記録画面でシュートを1本記録する */
export async function recordShot(page: Page, { zone, cell, result }: { zone: string; cell?: number; result: string }) {
  // 保存の完了は、シュート一覧の本数が1本増えることで確認する（前のトーストが残っていても誤判定しないように）
  const heading = page.getByRole('heading', { name: /^シュート一覧（\d+本）$/ });
  const before = Number((await heading.textContent())?.match(/\d+/)?.[0] ?? 0);
  await page.getByRole('button', { name: zone, exact: true }).click();
  if (cell !== undefined) await page.getByRole('button', { name: new RegExp(`^コース${cell}（`) }).click();
  await page.getByRole('radio', { name: result, exact: true }).click();
  await page.getByRole('button', { name: /^記録する/ }).click();
  await expect(heading).toHaveText(`シュート一覧（${before + 1}本）`);
}
