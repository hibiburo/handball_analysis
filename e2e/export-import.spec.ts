import { writeFileSync } from 'node:fs';
import { createGoalkeeper, createMatch, expect, recordShot, test } from './fixtures.ts';
import { installVideoPlayerMock } from './mocks/videoPlayerMock.ts';

test('全データを書き出し、データのないブラウザに取り込むと同じ内容が復元される（AC8）', async ({
  page,
  browser,
}, testInfo) => {
  await createGoalkeeper(page, { name: '書出 太郎', teamName: '書出大学' });
  await createMatch(page, { homeTeam: '書出大学', awayTeam: '相手' });
  await recordShot(page, { zone: 'センター', cell: 5, result: '失点' });
  await recordShot(page, { zone: '7mスロー', cell: 3, result: 'セーブ' });

  // 一度も書き出していないので警告が出る（AC10）
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('まだ一度もバックアップしていません');

  await page.getByRole('link', { name: 'データ管理・設定' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '全データを書き出す' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^handball_analysis_all_\d{8}\.json$/);
  const exportPath = testInfo.outputPath('export.json');
  await download.saveAs(exportPath);

  // 書き出したので警告は消える
  await page.goto('/');
  await expect(page.getByText('書出 太郎')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // データのない別のブラウザで取り込む
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.addInitScript(installVideoPlayerMock);
  await other.goto('/settings');
  await other.locator('input[type=file]').setInputFiles(exportPath);
  await expect(other.getByText(/GK 1人・試合 1件・シュート 2本 が含まれています/)).toBeVisible();
  await other.getByRole('button', { name: '取り込む' }).click();
  await expect(other.getByRole('status').filter({ hasText: '取り込みました' })).toBeVisible();

  await other.goto('/');
  await expect(other.getByRole('link', { name: /書出 太郎/ })).toContainText('試合 1 / シュート 2');
  await other.getByRole('link', { name: /書出 太郎/ }).click();
  await other.getByRole('link', { name: /書出大学 vs 相手/ }).click();
  await expect(other.getByRole('heading', { name: 'シュート一覧（2本）' })).toBeVisible();
  await context.close();
});

test('不正なファイルはエラーを表示し、既存データを変えない（AC9）', async ({ page }, testInfo) => {
  await createGoalkeeper(page, { name: '既存', teamName: '既存大学' });

  const badPath = testInfo.outputPath('bad.json');
  writeFileSync(badPath, JSON.stringify({ app: 'handball_analysis', schemaVersion: 1, goalkeepers: 'broken' }));
  const notJsonPath = testInfo.outputPath('not-json.json');
  writeFileSync(notJsonPath, 'これは JSON ではありません');

  await page.goto('/settings');
  await page.locator('input[type=file]').setInputFiles(badPath);
  await expect(page.getByRole('alert')).toContainText('不正なデータが含まれている');
  await page.locator('input[type=file]').setInputFiles(notJsonPath);
  await expect(page.getByRole('alert')).toContainText('ファイルを読み込めませんでした');

  await page.goto('/');
  await expect(page.getByRole('link', { name: /既存/ })).toBeVisible();
});
