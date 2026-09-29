import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  importErrorMessage,
  MAX_IMPORT_FILE_BYTES,
  parseImportFile,
  type ImportError,
  type ImportPreview,
} from '@/domain/transfer/importJson';
import type { ExportFile, Settings } from '@/domain/types';
import { dataTransferActions, downloadAllData, type ConflictPolicy } from '@/hooks/useDataTransfer';
import { settingsActions, useSettings } from '@/hooks/useSettings';
import { formatBytes, getStorageStatus, type StorageStatus } from '@/lib/storage';

/** SC5 データ管理・設定 */
export function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <h1 className="text-xl font-bold">データ管理・設定</h1>
      <ExportSection />
      <ImportSection />
      <SettingsSection />
      <StorageSection />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ExportSection() {
  const { lastBackupAt } = useSettings();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadAllData();
      showToast('全データを書き出しました', { tone: 'success' });
    } catch {
      showToast('書き出せませんでした。もう一度お試しください。', { tone: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card title="バックアップ（書き出し）">
      <p className="text-sm text-muted">
        データはこの端末のブラウザにだけ保存されています。定期的に全データを書き出して、別の場所に保管してください。GK単位・試合単位の書き出しは
        GK詳細の画面から行えます。
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={isExporting} onClick={handleExport}>
          全データを書き出す
        </Button>
        <span className="text-sm text-muted">
          最終バックアップ: {lastBackupAt ? new Date(lastBackupAt).toLocaleString('ja-JP') : 'まだありません'}
        </span>
      </div>
    </Card>
  );
}

type ImportState =
  | { step: 'idle' }
  | { step: 'error'; error: ImportError }
  | { step: 'preview'; fileName: string; file: ExportFile; preview: ImportPreview }
  | { step: 'importing' };

function ImportSection() {
  const { showToast } = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ step: 'idle' });
  const [policy, setPolicy] = useState<ConflictPolicy>('skip');

  function reset() {
    setState({ step: 'idle' });
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFile(selected: File) {
    if (selected.size > MAX_IMPORT_FILE_BYTES) {
      setState({ step: 'error', error: { code: 'too_large' } });
      return;
    }
    const parsed = parseImportFile(await selected.text());
    if (!parsed.ok) {
      setState({ step: 'error', error: parsed.error });
      return;
    }
    const preview = await dataTransferActions.previewImport(parsed.value);
    if (!preview.ok) {
      setState({ step: 'error', error: preview.error });
      return;
    }
    setState({ step: 'preview', fileName: selected.name, file: parsed.value, preview: preview.value });
  }

  async function handleImport(file: ExportFile) {
    setState({ step: 'importing' });
    try {
      const result = await dataTransferActions.importFile(file, policy);
      if (!result.ok) {
        setState({ step: 'error', error: result.error });
        return;
      }
      const { added, updated, skipped } = result.value;
      showToast(`取り込みました（追加 ${added}件・上書き ${updated}件・スキップ ${skipped}件）`, { tone: 'success' });
      reset();
    } catch {
      // 取り込みは1トランザクションのため、失敗した場合は何も保存されていない
      showToast('取り込みに失敗しました。データは変更されていません。', { tone: 'error' });
      reset();
    }
  }

  const conflictTotal =
    state.step === 'preview'
      ? state.preview.conflicts.goalkeepers + state.preview.conflicts.matches + state.preview.conflicts.shots
      : 0;

  return (
    <Card title="取り込み">
      <p className="text-sm text-muted">このアプリで書き出した JSON ファイルを取り込みます。</p>
      <div>
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-4 font-medium hover:bg-surface-hover"
        >
          ファイルを選ぶ
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void handleFile(selected);
          }}
        />
      </div>

      {state.step === 'error' && (
        <div role="alert" className="rounded-lg border border-danger p-3 text-sm">
          <p className="font-bold text-danger">{importErrorMessage(state.error)}</p>
          {(state.error.code === 'invalid_schema' || state.error.code === 'broken_reference') && (
            <ul className="mt-2 list-disc pl-5 text-xs text-muted">
              {(state.error.code === 'invalid_schema' ? state.error.issues : state.error.details).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">既存のデータは変更されていません。</p>
        </div>
      )}

      {state.step === 'preview' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3 text-sm">
          <p>
            <span className="font-bold">{state.fileName}</span> には GK {state.preview.counts.goalkeepers}人・試合{' '}
            {state.preview.counts.matches}件・シュート {state.preview.counts.shots}本 が含まれています。
          </p>
          {conflictTotal > 0 ? (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1">
                すでにあるデータと重なるものが {conflictTotal}件あります（GK {state.preview.conflicts.goalkeepers}・試合{' '}
                {state.preview.conflicts.matches}・シュート {state.preview.conflicts.shots}）。
              </legend>
              <label className="flex min-h-11 items-center gap-2">
                <input type="radio" name="policy" className="size-5" checked={policy === 'skip'} onChange={() => setPolicy('skip')} />
                スキップする（今あるデータを残す）
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="policy"
                  className="size-5"
                  checked={policy === 'overwrite'}
                  onChange={() => setPolicy('overwrite')}
                />
                上書きする（ファイルの内容で置き換える）
              </label>
            </fieldset>
          ) : (
            <p className="text-muted">すでにあるデータと重なるものはありません。</p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>キャンセル</Button>
            <Button variant="primary" onClick={() => void handleImport(state.file)}>
              取り込む
            </Button>
          </div>
        </div>
      )}
      {state.step === 'importing' && <p className="text-sm text-muted">取り込んでいます…</p>}
    </Card>
  );
}

type NumberSettingKey = 'highlightPreSeconds' | 'highlightPostSeconds' | 'lowSampleThreshold';

const numberSettings: { key: NumberSettingKey; label: string; hint: string; min: number; max: number; unit: string }[] = [
  { key: 'highlightPreSeconds', label: 'シーン再生の前余白', hint: '記録時刻の何秒前から再生するか', min: 0, max: 30, unit: '秒' },
  { key: 'highlightPostSeconds', label: 'シーン再生の後余白', hint: '記録時刻の何秒後まで再生するか', min: 0, max: 30, unit: '秒' },
  {
    key: 'lowSampleThreshold',
    label: '参考値にする枠内シュート数',
    hint: 'ヒートマップで、枠内シュートがこの本数未満のコースを参考値として表示する',
    min: 1,
    max: 50,
    unit: '本',
  },
];

function SettingsSection() {
  const settings = useSettings();
  const { showToast } = useToast();

  async function update(partial: Partial<Settings>) {
    try {
      await settingsActions.update(partial);
    } catch {
      showToast('設定を保存できませんでした。値の範囲を確認してください。', { tone: 'error' });
    }
  }

  return (
    <Card title="設定">
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5"
          checked={settings.autoResumeAfterRecord}
          onChange={(event) => void update({ autoResumeAfterRecord: event.target.checked })}
        />
        <span>
          記録後に自動で再生を再開する
          <span className="block text-xs text-muted">オンにすると、一時停止 → 位置 → コース → 結果 → 記録 の5タップで次のシュートへ進めます</span>
        </span>
      </label>
      {numberSettings.map(({ key, ...item }) => (
        <NumberSetting key={key} {...item} value={settings[key]} onCommit={(value) => void update({ [key]: value })} />
      ))}
    </Card>
  );
}

function NumberSetting({
  label,
  hint,
  min,
  max,
  unit,
  value,
  onCommit,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  unit: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  // 保存済みの値が変わったら（取り込みなど）入力欄にも反映する
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }
  const parsed = Number(text);
  const isValid = text.trim() !== '' && Number.isInteger(parsed) && parsed >= min && parsed <= max;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] items-center gap-3">
      <label htmlFor={id}>
        {label}
        <span className="block text-xs text-muted">{hint}</span>
      </label>
      <input
        id={id}
        inputMode="numeric"
        className={`min-h-11 w-20 rounded-lg border bg-surface px-3 text-right ${isValid ? 'border-border' : 'border-danger'}`}
        value={text}
        aria-invalid={!isValid || undefined}
        onChange={(event) => setText(event.target.value.replace(/[^0-9]/g, ''))}
        onBlur={() => {
          if (isValid && parsed !== value) onCommit(parsed);
          else if (!isValid) setText(String(value));
        }}
      />
      <span className="text-sm text-muted">
        {unit}（{min}〜{max}）
      </span>
    </div>
  );
}

function StorageSection() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  useEffect(() => {
    let isActive = true;
    void getStorageStatus().then((next) => {
      if (isActive) setStatus(next);
    });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Card title="保存状況">
      {status === null ? (
        <p className="text-sm text-muted">確認中…</p>
      ) : (
        <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">使用量</dt>
          <dd>
            {status.usage !== undefined ? formatBytes(status.usage) : '不明'}
            {status.quota !== undefined && <span className="text-muted">（上限の目安 {formatBytes(status.quota)}）</span>}
          </dd>
          <dt className="text-muted">データの永続化</dt>
          <dd>
            {status.isPersisted === true
              ? '有効（ブラウザが自動でデータを消すことはありません）'
              : status.isPersisted === false
                ? '無効（ブラウザが空き容量などの理由でデータを消す可能性があります。定期的に書き出してください）'
                : 'このブラウザでは確認できません'}
          </dd>
        </dl>
      )}
    </Card>
  );
}
